import torch.nn as nn

class ReviewLSTM(nn.Module):
    def __init__(self, input_size, hidden_size=64, num_layers=2):
        super(ReviewLSTM, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, 1)  # Output: next review day prediction

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        out = self.fc(lstm_out[:, -1, :])  # Use the last timestep output
        return out