import torch
import torch.nn as nn
import pandas as pd
from torch.utils.data import Dataset, DataLoader
from torch.optim import Adam
import pyarrow.parquet as pq
import glob
from models.review_lstm import ReviewLSTM

class FlashcardDataset(Dataset):
    def __init__(self, df, seq_length=10):
        self.seq_length = seq_length
        self.cards = df['card_id'].unique()
        self.data = []
        
        for card in self.cards:
            card_data = df[df['card_id'] == card].sort_values(by='day_offset')
            features = card_data[['day_offset', 'elapsed_days', 'elapsed_seconds', 'duration', 'rating', 'state']].values
            target = card_data['elapsed_days'].shift(-1).fillna(0).values  # Predict next review day
            
            # Create sequences
            for i in range(len(features) - seq_length):
                self.data.append((features[i:i+seq_length], target[i+seq_length]))

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        x, y = self.data[idx]
        return torch.tensor(x, dtype=torch.float32), torch.tensor(y, dtype=torch.float32)

# Load dataset from multiple parquet files
data_files = glob.glob("data/revlogs/user_id=*/data.parquet")[:5]
df_list = [pq.read_table(f).to_pandas() for f in data_files]
df = pd.concat(df_list, ignore_index=True)

# Normalize numerical features
df['duration'] = df['duration'] / 60000  # Normalize duration (0-1)
df['elapsed_days'] = df['elapsed_days'].replace(-1, 0)  # Replace new card indicator
df['elapsed_seconds'] = df['elapsed_seconds'].replace(-1, 0)

# Convert categorical values to indices (one-hot encoding could be used too)
df['rating'] = df['rating'] - 1  # Convert 1-4 scale to 0-3
df['state'] = df['state']  # Already numerical
 
# Hyperparameters
input_size = 6  # Number of input features
hidden_size = 64
num_layers = 2
learning_rate = 0.001
epochs = 10

# Data Preparation
dataset = FlashcardDataset(df)
dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

# Model, Loss, Optimizer
model = ReviewLSTM(input_size, hidden_size, num_layers)
criterion = nn.MSELoss()  # Regression loss
optimizer = Adam(model.parameters(), lr=learning_rate)

# Training Loop
for epoch in range(epochs):
    for x_batch, y_batch in dataloader:
        optimizer.zero_grad()
        outputs = model(x_batch)
        loss = criterion(outputs.squeeze(), y_batch)
        loss.backward()
        optimizer.step()

    print(f"Epoch {epoch+1}, Loss: {loss.item()}")

torch.save(model.state_dict(), "review_lstm.pth")
