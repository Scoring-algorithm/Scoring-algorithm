import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
import joblib
import os
from pathlib import Path

# ---------------------------------------------------------
# 1. Генерация синтетических данных
# ---------------------------------------------------------
np.random.seed(42)
n_users = 100
n_transactions = 5000

print("Генерация данных...")
data = {
    'user_id': np.random.choice([f'user-{i}' for i in range(n_users)], n_transactions),
    'device_id': np.random.choice(['iphone-12', 'samsung-s21', 'xiaomi-redmi', 'unknown-pc'], n_transactions),
    'amount': np.random.exponential(scale=2000, size=n_transactions), # Средний чек 2000
    'is_fraud': 0
}

df = pd.DataFrame(data)

# Логика фрода: если сумма огромная И устройство неизвестно, или аномалия
for idx, row in df.iterrows():
    # 5% транзакций делаем фродом
    if np.random.rand() < 0.05:
        df.at[idx, 'is_fraud'] = 1
        df.at[idx, 'amount'] = row['amount'] * np.random.uniform(5, 10) # Фроды обычно на крупные суммы
        if np.random.rand() < 0.5:
            df.at[idx, 'device_id'] = 'unknown-pc' # Фроды часто с левых устройств

# ---------------------------------------------------------
# 2. Feature Engineering (ИСПРАВЛЕНО)
# ---------------------------------------------------------
print("Расчет признаков (Feature Engineering)...")

# Сортируем по времени (в синтетике нет времени, поэтому просто по индексу)
df = df.reset_index(drop=True)

# Создаем пустые списки для новых признаков
amount_ratios = []
is_new_devices = []
tx_count_histories = []

for idx, row in df.iterrows():
    user_id = row['user_id']
    device_id = row['device_id']
    amount = row['amount']
    
    # Берем историю пользователя ДО текущей транзакции
    history = df.iloc[:idx]
    user_history = history[history['user_id'] == user_id]
    
    if len(user_history) == 0:
        avg_amount = amount # Если истории нет, ratio = 1
        is_new_device = 1
        tx_count_history = 0
    else:
        avg_amount = user_history['amount'].mean()
        known_devices = user_history['device_id'].unique()
        is_new_device = 1 if device_id not in known_devices else 0
        tx_count_history = len(user_history)
        
    amount_ratio = amount / avg_amount if avg_amount > 0 else 1.0
    
    # Сохраняем только новые признаки (без amount!)
    amount_ratios.append(round(amount_ratio, 2))
    is_new_devices.append(is_new_device)
    tx_count_histories.append(tx_count_history)

# Присваиваем новые колонки прямо в df (никакого concat!)
df['amount_ratio'] = amount_ratios
df['is_new_device'] = is_new_devices
df['tx_count_history'] = tx_count_histories

# ---------------------------------------------------------
# 3. Обучение модели
# ---------------------------------------------------------
print("Обучение модели...")
# ВАЖНО: Теперь колонка 'amount' в df только одна
FEATURES = ['amount', 'amount_ratio', 'is_new_device', 'tx_count_history']
X = df[FEATURES]
y = df['is_fraud']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Используем Random Forest
model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
model.fit(X_train, y_train)

# ---------------------------------------------------------
# 4. Оценка качества
# ---------------------------------------------------------
y_pred_proba = model.predict_proba(X_test)[:, 1]
y_pred = model.predict(X_test)

print("\n--- Результаты обучения ---")
print(f"ROC-AUC: {roc_auc_score(y_test, y_pred_proba):.4f}")
print(classification_report(y_test, y_pred))

# Проверим на выдуманной аномалии
print("\n--- Проверка на подозрительной транзакции ---")
suspicious_tx = pd.DataFrame([{
    'amount': 50000, 
    'amount_ratio': 25.0, # в 25 раз больше обычного
    'is_new_device': 1, 
    'tx_count_history': 10
}])
prob = model.predict_proba(suspicious_tx)[0][1]
print(f"Вероятность фрода: {prob:.2f} (ожидаем высокую)")

# ---------------------------------------------------------
# 5. Сохранение модели (ИСПРАВЛЕНО)
# ---------------------------------------------------------
# Определяем путь к папке, где лежит этот скрипт (analytics)
CURRENT_DIR = Path(__file__).resolve().parent 
# Поднимаемся на уровень выше (в корень Scoring-algorithm) и заходим в models/champion
MODEL_DIR = CURRENT_DIR.parent / 'models' / 'champion'

# Создаем папку, если ее нет
MODEL_DIR.mkdir(parents=True, exist_ok=True)

model_path = MODEL_DIR / 'model.pkl'
joblib.dump(model, model_path)

print(f"\nМодель успешно сохранена по пути: {model_path}")