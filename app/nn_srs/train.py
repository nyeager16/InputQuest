import os
import glob
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import numpy as np
from models.lstm_srs import LSTMSRS
from sklearn.preprocessing import StandardScaler
import time

# Device selection
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Path where user data is stored
data_dir = "data/revlogs/"

# Get list of all user files
user_files = glob.glob(os.path.join(data_dir, "user_id=*/data.parquet"))
user_files = user_files[:50]

# Hyperparameters
hidden_size = 64
num_layers = 2
output_size = 1
batch_size = 16  # Adjust batch size based on available memory
epochs = 10
learning_rate = 0.001

# Define model
input_size = 8  # Adjust this based on the number of features in your data
model = LSTMSRS(input_size, hidden_size, num_layers, output_size).to(device)
criterion = nn.MSELoss()
optimizer = optim.Adam(model.parameters(), lr=learning_rate)

# Preprocess data function
def preprocess_data(revlogs):
    # Fill in missing values for new cards (elapsed_days and elapsed_seconds)
    revlogs['elapsed_days'] = revlogs['elapsed_days'].replace(-1, 0)
    revlogs['elapsed_seconds'] = revlogs['elapsed_seconds'].replace(-1, 0)
    
    # Normalize features: duration, day_offset, elapsed_days, and elapsed_seconds
    scaler = StandardScaler()
    features_to_scale = ['day_offset', 'duration', 'elapsed_days', 'elapsed_seconds']
    revlogs[features_to_scale] = scaler.fit_transform(revlogs[features_to_scale])
    
    # One-hot encode the 'state' column, ensuring that we create all 4 states (0, 1, 2, 3)
    revlogs = pd.get_dummies(revlogs, columns=['state'], drop_first=False)

    # Prepare X and y
    state_columns = ['state_0', 'state_1', 'state_2', 'state_3']  # All possible states, including state_0
    available_state_columns = [col for col in state_columns if col in revlogs.columns]
    
    # Ensure X always has 8 columns: 4 features + 4 states (even if some are missing)
    missing_columns = list(set(state_columns) - set(available_state_columns))
    
    # Add missing state columns filled with zeros if necessary
    for col in missing_columns:
        revlogs[col] = 0  # Add missing state columns with all zeros
    
    # Prepare the feature matrix X (with 8 columns) and target y
    X = revlogs[['day_offset', 'duration', 'elapsed_days', 'elapsed_seconds'] + state_columns].values
    y = revlogs['rating'].values  # Rating is the target
    
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)

# Create sequences for LSTM model
def create_sequences(X, y, seq_length):
    sequences_X = []
    sequences_y = []
    for i in range(len(X) - seq_length):
        sequences_X.append(X[i:i+seq_length])
        sequences_y.append(y[i+seq_length])
    return np.array(sequences_X), np.array(sequences_y)

# Custom Dataset class to handle multiple files
class RevlogDataset(Dataset):
    def __init__(self, file_paths, seq_length):
        self.file_paths = file_paths
        self.seq_length = seq_length
        self.data = self._load_data()

    def _load_data(self):
        all_X = []
        all_y = []
        for file in self.file_paths:
            revlogs = pd.read_parquet(file)
            X, y = preprocess_data(revlogs)
            X_seq, y_seq = create_sequences(X, y, self.seq_length)
            all_X.append(X_seq)
            all_y.append(y_seq)
        
        # Stack all data from all files
        all_X = np.vstack(all_X)
        all_y = np.concatenate(all_y)
        return torch.tensor(all_X, dtype=torch.float32), torch.tensor(all_y, dtype=torch.float32)

    def __len__(self):
        return len(self.data[0])

    def __getitem__(self, idx):
        return self.data[0][idx], self.data[1][idx]

# Main training loop
if __name__ == '__main__':
    # Create the dataset and dataloader
    seq_length = 10  # Adjust as needed
    dataset = RevlogDataset(user_files, seq_length)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    for epoch in range(epochs):
        start_time = time.time()
        model.train()
        total_loss = 0
        for X_batch, y_batch in dataloader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device).unsqueeze(1)

            optimizer.zero_grad()
            outputs = model(X_batch)  # No need to add an extra dimension here
            loss = criterion(outputs, y_batch)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        end_time = time.time()  # Record end time of epoch
        epoch_duration = end_time - start_time  # Calculate duration of epoch

        print(f"Epoch [{epoch+1}/{epochs}], Loss: {total_loss/len(dataloader):.4f}, Time: {epoch_duration:.2f} seconds")

    # Save model
    torch.save(model.state_dict(), "models/lstm_srs.pth")
