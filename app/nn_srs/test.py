import os
import glob
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
import numpy as np
from models.lstm_srs import LSTMSRS
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error
import time

# Device selection
device = "cpu"

# Path where user data is stored
data_dir = "data/revlogs/"

# Get list of all user files (using the same directory as training)
user_files = glob.glob(os.path.join(data_dir, "user_id=*/data.parquet"))
user_files = user_files[:50]

# Hyperparameters
hidden_size = 64
num_layers = 2
output_size = 1
batch_size = 16  # Adjust batch size based on available memory
seq_length = 10  # Adjust as needed

# Define model
input_size = 8  # The number of features in the data
model = LSTMSRS(input_size, hidden_size, num_layers, output_size).to(device)

# Load saved model
model.load_state_dict(torch.load("models/lstm_srs.pth"))
model.eval()  # Set the model to evaluation mode

# Preprocess data function
def preprocess_data(revlogs):
    revlogs['elapsed_days'] = revlogs['elapsed_days'].replace(-1, 0)
    revlogs['elapsed_seconds'] = revlogs['elapsed_seconds'].replace(-1, 0)

    scaler = StandardScaler()
    features_to_scale = ['day_offset', 'duration', 'elapsed_days', 'elapsed_seconds']
    revlogs[features_to_scale] = scaler.fit_transform(revlogs[features_to_scale])

    revlogs = pd.get_dummies(revlogs, columns=['state'], drop_first=False)

    state_columns = ['state_0', 'state_1', 'state_2', 'state_3']
    available_state_columns = [col for col in state_columns if col in revlogs.columns]

    missing_columns = list(set(state_columns) - set(available_state_columns))
    for col in missing_columns:
        revlogs[col] = 0

    X = revlogs[['day_offset', 'duration', 'elapsed_days', 'elapsed_seconds'] + state_columns].values
    y = revlogs['rating'].values
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

        all_X = np.vstack(all_X)
        all_y = np.concatenate(all_y)
        return torch.tensor(all_X, dtype=torch.float32), torch.tensor(all_y, dtype=torch.float32)

    def __len__(self):
        return len(self.data[0])

    def __getitem__(self, idx):
        return self.data[0][idx], self.data[1][idx]

# Main test loop
if __name__ == '__main__':
    # Create the dataset and dataloader
    dataset = RevlogDataset(user_files, seq_length)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=False)

    all_predictions = []
    all_true_values = []

    for X_batch, y_batch in dataloader:
        X_batch, y_batch = X_batch.to(device), y_batch.to(device).unsqueeze(1)

        # Make predictions
        with torch.no_grad():  # Disable gradient calculation for inference
            outputs = model(X_batch)
        
        # Collect predictions and true values
        all_predictions.append(outputs.cpu().numpy())
        all_true_values.append(y_batch.cpu().numpy())

    # Convert predictions and true values to numpy arrays
    all_predictions = np.concatenate(all_predictions, axis=0)
    all_true_values = np.concatenate(all_true_values, axis=0)

    # Calculate Mean Squared Error (MSE) for evaluation
    mse = mean_squared_error(all_true_values, all_predictions)
    print(f"Test MSE: {mse:.4f}")
    
    # Optionally, save predictions to a file for further analysis
    predictions_df = pd.DataFrame({'True Values': all_true_values, 'Predictions': all_predictions})
    predictions_df.to_csv('test_predictions.csv', index=False)
