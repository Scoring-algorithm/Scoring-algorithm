from backend.core.logging import get_logger

logger = get_logger(__name__)

class MockModel:
    def predict(self, features: dict) -> float:
        """
        features = {
            "amount": 50000,
            "amount_ratio": 4.5,      # во сколько раз текущая сумма больше средней
            "is_new_device": 1,       # 1 - новое устройство, 0 - старое
            "tx_count_history": 15    # сколько всего транзакций было
        }
        """
        score = 0.1  # базовый уровень риска
        
        # Правило 1: Сумма в 3 раза больше обычной
        if features["amount_ratio"] > 3.0:
            score += 0.5
        elif features["amount_ratio"] > 1.5:
            score += 0.2
            
        # Правило 2: Новое устройство
        if features["is_new_device"] == 1:
            score += 0.3
            
        # Правило 3: Слишком много транзакций (велосити)
        if features["tx_count_history"] > 10:
            score += 0.1

        final_score = min(round(score, 2), 0.99)
        logger.info(f"MockModel посчитала score: {final_score} на основе фичей: {features}")
        return final_score

model = MockModel()