# backend/ml/inference.py
import os
import joblib
import pandas as pd
from backend.core.config import settings
from backend.core.logging import get_logger
from backend.core.config import settings

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
        if self.model is None:
            logger.warning("Модель не загружена, используется заглушка")
            return 0.5
            
        try:
            features_df = pd.DataFrame([{
                'amount': features['amount'],
                'amount_ratio': features['amount_ratio'],
                'is_new_device': features['is_new_device'],
                'tx_count_history': features['tx_count_history']
            }])
            prob = self.model.predict_proba(features_df)[0][1]
            return round(float(prob), 2)
            
        except Exception as e:
            logger.error(f"Ошибка предсказания модели: {e}")
            
            # ЛОГИКА FALLBACK
            if settings.fallback_enabled:
                logger.info("Применение fallback-логики (эвристики)")
                # Пример: если сумма огромная или ratio космический, отклоняем
                if features.get("amount", 0) > 100000 or features.get("amount_ratio", 1.0) > 20:
                    return 0.9
                # Иначе отправляем на ручную проверку
                return 0.5
            
            # Если fallback выключен - отказываем в обслуживании (fail-safe)
            return 0.99

    def get_explanations(self, features: dict, score: float) -> list[dict]:
        explanations = []
        
        amount = features.get('amount', 0)
        ratio = features.get('amount_ratio', 1.0)
        is_new_device = features.get('is_new_device', 0)
        tx_count = features.get('tx_count_history', 0)

        # 1. АНАЛИЗ АБСОЛЮТНОЙ СУММЫ (добавляем риск, если сумма объективно большая)
        if amount > 100000:
            explanations.append({"type": "risk", "text": f"Критически крупная сумма ({amount:,.0f} ₽)"})
        elif amount > 30000:
            explanations.append({"type": "risk", "text": "Крупная сумма для транзакции"})

        # 2. АНАЛИЗ ОТНОСИТЕЛЬНОЙ СУММЫ (amount_ratio)
        if ratio > 3.0:
            explanations.append({"type": "risk", "text": f"Сумма превышает обычную в {ratio:.1f} раз(а)"})
        elif ratio < 0.5:
            # Если сумма ниже обычной, но всё равно большая (например, 50к), 
            # добавляем нейтральную/риск причину, чтобы не путать пользователя
            if amount > 30000:
                explanations.append({"type": "neutral", "text": "Ниже среднего чека клиента, но сумма всё еще крупная"})
            else:
                explanations.append({"type": "safe", "text": "Сумма значительно ниже обычной"})

        # 3. АНАЛИЗ УСТРОЙСТВА
        if is_new_device == 1:
            explanations.append({"type": "risk", "text": "Новое (неизвестное) устройство"})
        else:
            explanations.append({"type": "safe", "text": "Привычное устройство"})

        # 4. АНАЛИЗ ИСТОРИИ
        if tx_count == 0:
            explanations.append({"type": "risk", "text": "Первая транзакция пользователя"})
        elif tx_count < 3:
            explanations.append({"type": "neutral", "text": "Короткая история транзакций"})
        elif tx_count > 10:
            explanations.append({"type": "safe", "text": "Долгая и стабильная история"})

        return explanations
    
# Инициализируем модель при старте приложения
model = ScoringModel(model_path=settings.model_path)