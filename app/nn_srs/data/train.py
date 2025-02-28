import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from datasets import load_dataset

# Load Anki Revlogs 10K dataset
anki_ds = load_dataset("open-spaced-repetition/anki-revlogs-10k", "revlogs")

# Extract review logs
data = anki_ds["train"]

# Define a custom dataset class
class AnkiDataset(Dataset):
    def __init__(self, data):
        self.data = data
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        item = self.data[idx]
        x = torch.tensor([item["day_offset"], item["rating"], item["state"], item["duration"], item["elapsed_days"], item["elapsed_seconds"]], dtype=torch.float32)
        y = torch.tensor(item["elapsed_days"], dtype=torch.float32)  # Predict next interval
        return x, y

# Create dataset and dataloaders
dataset = AnkiDataset(data)
dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

# Define the neural network class
class SpacedRepetitionNN(nn.Module):
    def __init__(self):
        super(SpacedRepetitionNN, self).__init__()
        self.fc1 = nn.Linear(6, 32)
        self.fc2 = nn.Linear(32, 16)
        self.fc3 = nn.Linear(16, 1)
        self.relu = nn.ReLU()
    
    def forward(self, x):
        x = self.relu(self.fc1(x))
        x = self.relu(self.fc2(x))
        x = self.fc3(x)  # Output: predicted next review interval
        return x

# Initialize model, loss function, and optimizer
model = SpacedRepetitionNN()
criterion = nn.MSELoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

# Training loop
epochs = 10
for epoch in range(epochs):
    total_loss = 0
    for x_batch, y_batch in dataloader:
        optimizer.zero_grad()
        predictions = model(x_batch).squeeze()
        loss = criterion(predictions, y_batch)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
    print(f"Epoch {epoch+1}/{epochs}, Loss: {total_loss/len(dataloader):.4f}")

print("Training complete!")