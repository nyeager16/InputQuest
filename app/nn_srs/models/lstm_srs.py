import torch
import torch.nn as nn
import torch.optim as optim

class LSTMSRS(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, output_size, dropout=0.2):
        super(LSTMSRS, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # Define the LSTM layer
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=dropout)
        
        # Define the fully connected layer for output
        self.fc = nn.Linear(hidden_size, output_size)
        
        # Define activation function (ReLU is optional based on the output)
        self.relu = nn.ReLU()

    def forward(self, x):
        # Initialize hidden and cell states with zeros
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        
        # Pass the data through the LSTM
        out, _ = self.lstm(x, (h0, c0))
        
        # Take the last LSTM output (the output for the last timestep in the sequence)
        out = self.fc(self.relu(out[:, -1, :]))  # out[:, -1, :] selects the last timestep
        
        return out

# Example usage for model initialization
if __name__ == "__main__":
    input_size = 7  # The number of input features after one-hot encoding 'state' and other features
    hidden_size = 64
    num_layers = 2
    output_size = 1  # Predicting the recall rating
    dropout = 0.2

    model = LSTMSRS(input_size, hidden_size, num_layers, output_size, dropout)
    sample_input = torch.randn(32, 10, input_size)  # Batch size of 32, sequence length of 10, input_size = 7
    output = model(sample_input)
    print(output.shape)  # Expected output: (32, 1) since we are predicting a single value for each batch element
