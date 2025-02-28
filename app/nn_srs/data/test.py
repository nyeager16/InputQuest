from sklearn.model_selection import KFold
import numpy as np

# Define K-Fold Cross-Validation
k_folds = 5
kf = KFold(n_splits=k_folds, shuffle=True, random_state=42)

# Convert dataset to a list for indexing
data_list = list(dataset)

# Cross-validation loop
for fold, (train_idx, test_idx) in enumerate(kf.split(data_list)):
    print(f"Fold {fold+1}/{k_folds}")

    # Create train and test subsets
    train_subset = [data_list[i] for i in train_idx]
    test_subset = [data_list[i] for i in test_idx]

    # Convert subsets to DataLoader
    train_loader = DataLoader(AnkiDataset(train_subset), batch_size=32, shuffle=True)
    test_loader = DataLoader(AnkiDataset(test_subset), batch_size=32, shuffle=False)

    # Reinitialize model for each fold
    model = SpacedRepetitionNN()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    # Training loop
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        for x_batch, y_batch in train_loader:
            optimizer.zero_grad()
            predictions = model(x_batch).squeeze()
            loss = criterion(predictions, y_batch)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        print(f"Epoch {epoch+1}/{epochs}, Loss: {total_loss/len(train_loader):.4f}")

    # Evaluation on the test set
    model.eval()
    test_loss = 0
    with torch.no_grad():
        for x_batch, y_batch in test_loader:
            predictions = model(x_batch).squeeze()
            loss = criterion(predictions, y_batch)
            test_loss += loss.item()
    print(f"Fold {fold+1} Test Loss: {test_loss/len(test_loader):.4f}\n")

print("Cross-validation complete!")
