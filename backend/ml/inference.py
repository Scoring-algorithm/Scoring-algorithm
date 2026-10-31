# backend/ml/inference.py
import os
import joblib
import pandas as pd
from backend.core.config import settings
from backend.core.logging import get_logger

logger = get_logger(__name__)

class ScoringModel:
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.model = None
        self.load_model()

    def load_model(self):
        """Загружает модель из файла. Если файла нет — создает заглушку."""
        try:
            # Проверяем, существует ли файл
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                logger.info(f"ML-модель успешно загружена из {self.model_path}")
            else:
                logger.warning(f"Файл модели {self.model_path} не найден! Используется заглушка.")
                self.model = None
        except Exception as e:
            logger.error(f"Ошибка загрузки модели: {e}")
            self.model = None

    def predict(self, features: dict) -> float:
        """
        Принимает словарь с фичами от scoring_service.py.
        Возвращает вероятность фрода (0.0 - 1.0).
        """
        if self.model is None:
            # Заглушка, если Дарья еще не прислала модель
            return 0.5
            
        try:
            # ВАЖНО: Преобразуем словарь в DataFrame, чтобы sklearn не ругался на названия колонок
            # Порядок колонок должен совпадать с тем, на чем училась Дарья
            features_df = pd.DataFrame([{
                'amount': features['amount'],
                'amount_ratio': features['amount_ratio'],
                'is_new_device': features['is_new_device'],
                'tx_count_history': features['tx_count_history']
            }])
            
            # predict_proba возвращает [вероятность_0, вероятность_1]
            # Нам нужна вероятность класса 1 (фрод)
            prob = self.model.predict_proba(features_df)[0][1]
            return round(float(prob), 2)
            
        except Exception as e:
            logger.error(f"Ошибка предсказания модели: {e}")
            return 0.99 # Если модель сломалась, лучше отклонить транзакцию (fail-safe)

# Инициализируем модель при старте приложения
model = ScoringModel(model_path=settings.model_path)