import asyncio
import logging
from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import Message

# Вставьте сюда ваш токен от BotFather
TOKEN = "9116324253:AAHdOxtx7MRee4w_9j8je3durfF4j__zp-E"

# Инициализируем бота и диспетчер
bot = Bot(token=TOKEN)
dp = Dispatcher()

# Обработчик команды /start
@dp.message(CommandStart())
async def cmd_start(message: Message):
    welcome_text = (
        "Привет!\n"
        "Спасибо, что пользуетесь ботом расписания GSU! 📚"
    )
    await message.answer(welcome_text)

async def main():
    logging.basicConfig(level=logging.INFO)
    print("Бот запущен...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())