// Строгий режим для повышения качества кода и безопасности
"use strict";

// Индекс текущего активного видео
let currentVideoIndex = 0;
// Счетчик для назначения индексов новым видео (инкрементируется при каждом создании)
let latestVideoIndex = 0;
// Индекс предыдущего видео для корректной остановки воспроизведения
let prevVideoIndex = null;
// Флаг состояния звука (true - звук выключен, false - звук включен)
let userMuted = true;

// Корневой контейнер приложения, куда будут добавляться видео
const appContainer = document.querySelector("#app");

/**
 * Менеджер запросов - возвращает случайный URL видео из доступных
 * @param {string} url - базовый путь к директории с видео
 * @returns {Promise<string>} - полный путь к случайному видео
 */
const requestManager = async (url) => {
  // Массив доступных видеофайлов
  const videoNamesArr = [
    "1.mp4",
    "2.mp4",
    "3.mp4",
    "4.mp4",
    "5.mp4",
    "6.mp4",
    "7.mp4",
    "8.mp4",
    "9.mp4",
    "10.mp4",
  ];

  // Генерация случайного индекса для выбора видео
  const randomIndex = Math.floor(Math.random() * videoNamesArr.length);

  return `${url}/${videoNamesArr[randomIndex]}`;
};

/**
 * Функция debounce для оптимизации частых вызовов (например, при скролле)
 * @param {Function} func - функция, которую нужно вызвать после задержки
 * @param {number} delay - задержка в миллисекундах
 * @returns {Function} - обернутая функция с debounce
 */
const debounce = (func, delay) => {
  let timer = null;

  return (...args) => {
    // Сбрасываем предыдущий таймер при новом вызове
    if (timer) {
      clearTimeout(timer);
    }

    // Устанавливаем новый таймер
    timer = setTimeout(() => {
      func(...args);
      timer = null;
    }, delay);
  };
};

/**
 * Создает DOM-элементы для видео с уникальным индексом
 * @param {string} url - URL видеофайла
 * @returns {HTMLElement} - контейнер с видео и элементами управления
 */
function createVideoItem(url) {
  // Основной контейнер видео
  const videoContainer = document.createElement("div");
  videoContainer.classList.add("video-container");
  // Сохраняем уникальный индекс видео для последующего доступа
  videoContainer.dataset.videoIndex = latestVideoIndex;

  latestVideoIndex++; // Инкрементируем для следующего видео

  // Обертка для видео (для позиционирования)
  const videoWrap = document.createElement("div");
  videoWrap.classList.add("video-wrap");

  // Иконка/кнопка управления звуком
  const videoMute = document.createElement("div");
  videoMute.classList.add("video-mute");
  videoMute.dataset.videoMuted = true; // Начальное состояние - заглушен

  // Элемент видео
  const video = document.createElement("video");
  video.loop = true; // Зацикливание воспроизведения
  video.muted = true; // По умолчанию звук выключен (требование автоплея браузеров)

  // Источник видео
  const source = document.createElement("source");
  source.src = url;
  source.type = "video/mp4";

  // Сборка DOM-структуры
  video.appendChild(source);
  videoWrap.appendChild(video);
  videoWrap.appendChild(videoMute);
  videoContainer.appendChild(videoWrap);

  return videoContainer;
}

/**
 * Асинхронно создает и добавляет новый видео-контейнер в приложение
 */
const createVideoContainer = async () => {
  // Получаем случайное видео через менеджер запросов
  const videoUrl = await requestManager("./mockAssets");

  // Добавляем созданный контейнер в DOM
  appContainer.appendChild(createVideoItem(videoUrl));
};

/**
 * Определяет индекс текущего активного видео на основе позиции скролла
 * @returns {number|null} - индекс текущего видео или null
 */
function getCurrentVideoIndex() {
  let currentIndex = null;

  // Округляем для точного сравнения
  const scrollPosition = Math.round(appContainer.scrollTop);
  const viewportHeight = Math.round(window.innerHeight);

  // Особый случай для самого верха (scrollPosition = 0)
  if (scrollPosition === 0) {
    currentIndex = 0;
  } else {
    // Вычисляем индекс: позиция скролла делится на высоту вьюпорта
    currentIndex = Math.round(scrollPosition / viewportHeight);
  }

  return currentIndex;
}

/**
 * Переключает активное видео:
 * - Останавливает предыдущее видео
 * - Запускает текущее с правильными настройками звука
 */
const changeActiveVideo = () => {
  // Обработка предыдущего видео (если оно существует)
  if (prevVideoIndex !== null) {
    const prevVideoContainer = document.querySelector(
      `[data-video-index="${prevVideoIndex}"]`,
    );
    const prevVideo = prevVideoContainer.querySelector(`video`);

    // Сброс состояния предыдущего видео
    prevVideo.pause(); // Остановка воспроизведения
    prevVideo.muted = true; // Выключение звука
    prevVideo.currentTime = 0; // Сброс на начало

    // Обновление иконки mute
    const muteIconPrev = prevVideoContainer.querySelector(".video-mute");
    muteIconPrev.dataset.videoMuted = true;
  }

  // Обработка текущего видео
  const currentVideoContainer = document.querySelector(
    `[data-video-index="${currentVideoIndex}"]`,
  );
  const currentVideo = currentVideoContainer.querySelector(`video`);

  // Запуск с учетом пользовательских настроек звука
  currentVideo.play();
  currentVideo.muted = userMuted;

  // Обновление иконки mute в соответствии с состоянием
  const muteIconCurrent = currentVideoContainer.querySelector(".video-mute");
  muteIconCurrent.dataset.videoMuted = userMuted;
};

/**
 * Debounced обработчик скролла для оптимизации производительности
 * - Обновляет индексы видео
 * - Подгружает новые видео при приближении к концу
 * - Переключает активное видео
 */
const debouncedScroll = debounce(() => {
  // Получаем все видео-контейнеры в DOM
  const videosList = document.querySelectorAll(".video-container");

  // Сохраняем предыдущий индекс перед обновлением текущего
  prevVideoIndex = currentVideoIndex;
  currentVideoIndex = getCurrentVideoIndex();

  // Бесконечная прокрутка: подгружаем новые видео, если осталось 2 или меньше
  if (currentVideoIndex >= videosList.length - 2) {
    loadMoreVideos(3); // Подгружаем по 3 видео за раз
  }

  // Переключаем воспроизведение на новое активное видео
  changeActiveVideo();
}, 100); // Задержка 100мс для оптимизации

/**
 * Загружает указанное количество дополнительных видео
 * @param {number} videosToLoad - количество видео для загрузки
 */
const loadMoreVideos = async (videosToLoad) => {
  for (let i = 0; i < videosToLoad; i++) {
    await createVideoContainer(); // Асинхронное создание каждого видео
  }
};

/**
 * Инициализация приложения:
 * - Настройка обработчиков событий
 * - Загрузка начальных видео
 * - Запуск первого видео
 */
const appInit = async () => {
  // Обработчик скролла с debounce для плавной работы
  appContainer.addEventListener("scroll", debouncedScroll);

  // Обработчик кликов для управления звуком
  appContainer.addEventListener("click", (event) => {
    let target = event.target;

    // Проверяем, что клик был по кнопке mute
    if (target.classList.contains("video-mute")) {
      const currentVideo = document.querySelector(
        `[data-video-index="${currentVideoIndex}"] video`,
      );

      // Переключаем состояние звука для текущего видео
      target.dataset.videoMuted = !userMuted;
      currentVideo.muted = !userMuted;

      // Обновляем глобальный флаг состояния звука
      userMuted = currentVideo.muted;
    }
  });

  // Загружаем первые 3 видео
  await loadMoreVideos(3);

  // Запускаем первое активное видео
  changeActiveVideo();
};

// Запуск приложения
appInit();
