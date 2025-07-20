//

// Realizamos las importaciones necesarias
import { getExercises, saveUserTest } from './supabase.js';
import { showScreen } from './utils.js';

// Configuración general para los ejercicios
const EXERCISE_SETTINGS = 
{
    // Tiempo en minutos que se mantiene la caché de ejercicios
    cacheExpiryMinutes: 30,
    
    // Tiempo en minutos para la rotación de anuncios
    adRotationMinutes: 1
};

// Estado global del módulo de práctica
const exerciseState = 
{
    // ID del ejercicio actualmente mostrado
    currentExerciseId: null, 
        
    // Lista de todos los ejercicios del tema seleccionado
    exercises: [], 
    
    // Respuestas del usuario indexadas por ID de ejercicio
    userAnswers: {}, 
    
    // Información del tema seleccionado
    selectedTopic: null,
    
    // Indicador de estado de carga
    isLoading: false, 
    
    // Configuración del modo práctica
    practiceMode: 
    {
        // Indica si el modo práctica está activo
        active: false, 
        
        // Timestamp de inicio de la práctica
        startTime: null, 
        
        // Duración esperada en minutos
        expectedDuration: 0, 
        
        // Tiempo restante en segundos
        remainingTime: 0,
        
        // ID del temporizador para control del tiempo
        timerId: null 
    },
    
    // Referencia al temporizador de rotación de anuncios
    adRotationTimer: null,
    
    // Índice actual del anuncio mostrado
    currentAdIndex: 0
};

// Inicialización del modo práctica
if (document.location.pathname.includes('practice.html')) 
{
    // Activamos el modo práctica
    exerciseState.practiceMode.active = true;
}

// Función que carga los ejercicios de un tema específico y actualiza la interfaz
async function loadTopicExercises(topicId) 
{
    // Intentar cargar ejercicios
    try 
    {
        // Indicar que se está cargando
        exerciseState.isLoading = true;
        
        // Obtener ejercicios desde la base de datos
        const exercises = await getExercises(topicId);
        
        // Actualizar el estado con los ejercicios cargados
        exerciseState.exercises = Array.isArray(exercises) ? exercises : [];
        
        // Asignar el ID del primer ejercicio
        exerciseState.currentExerciseId = exerciseState.exercises[0].id;
        
        // Renderizar el primer ejercicio
        renderExercise(exerciseState.currentExerciseId);
    
        // Renderizar la barra lateral con la lista de ejercicios
        renderSidebar();
        
        // Devolver ejercicios cargados
        return exercises;
    } 
    catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al intentar cargar los ejercicios. Por favor intentalo de nuevo.');
        
        // Redirigir a la página de error
        window.location.href = 'error.html';
    }
}

// Función para renderizar un ejercicio específico
function renderExercise(exerciseId) 
{
    // Convertir el ID del ejercicio a número
    const exerciseIdNum = Number(exerciseId);
    
    // Buscar el ejercicio en la lista de ejercicios
    const exercise = exerciseState.exercises.find(ex => ex.id === exerciseIdNum);
    
    // Obtener el contenedor del ejercicio
    const exerciseContainer = document.getElementById('exercise-content');
    
    // Si no se encuentra el contenedor
    if (!exerciseContainer) return;
    
    // Establecer el ID del ejercicio actual
    exerciseState.currentExerciseId = exerciseIdNum;
    
    // Generar el HTML del ejercicio
    let exerciseHTML = `
            <div class="question-container">${exercise.question || 'No hay pregunta disponible'}</div>
            
            <div class="exercise-options">
                ${exercise.options && exercise.options.length > 0 ? exercise.options.map((option, index) => `
                    <button class="option-button" 
                            data-option="${index}"
                            data-disabled="false"
                            ${exerciseState.userAnswers[exerciseId] === index.toString() ? 'data-selected="true"' : ''}>
                        <span class="option-letter">${String.fromCharCode(65 + index)}</span>
                        <span class="option-text">${option}</span>
                    </button>
                `).join('') : '<p>No hay opciones disponibles</p>'}
            </div>
    `;
    
    // Obtener el índice del ejercicio actual
    const currentIndex = exerciseState.exercises.findIndex(ex => ex.id === exerciseIdNum);
    
    // Verificar si es el primer ejercicio
    const isFirstExercise = currentIndex === 0;
    
    // Verificar si es el último ejercicio
    const isLastExercise = currentIndex === exerciseState.exercises.length - 1;
    
    // Botón para navegación y finalización de práctica
    exerciseHTML += `
        <div class="button-row">
            <button id="prev-exercise" class="button prev-button" ${isFirstExercise ? 'disabled' : ''}>
                <i class="fas fa-arrow-left"></i> Anterior
            </button>
            <button id="submit-answer" class="button primary-button danger-button">
                Finalizar
            </button>
            <button id="next-exercise" class="button next-button" ${isLastExercise ? 'disabled' : ''}>
                Siguiente <i class="fas fa-arrow-right"></i>
            </button>
        </div>
    `;
    
    // Asignar el HTML al contenedor
    exerciseContainer.innerHTML = exerciseHTML;
    
    // Inicializar el botón de finalización
    const actionButton = document.getElementById('submit-answer');
    
    // Si se encuentra el botón
    if (actionButton) 
    {
        // En modo práctica, el botón siempre está habilitado y dice "Finalizar"
        actionButton.disabled = false;
    }
    
    // Configurar los manejadores de eventos
    setupExerciseEventListeners();
    
    // Renderizar la barra lateral
    renderSidebar();
}

// Función para verificar la respuesta seleccionada
function checkAnswer(selectedIndex) 
{
    // Obtener el ID del ejercicio actual
    const exerciseId = exerciseState.currentExerciseId;
    
    // Buscar el ejercicio correspondiente
    const exercise = exerciseState.exercises.find(ex => ex.id === exerciseId);
    
    // Si no se encuentra el ejercicio, salir
    if (!exercise) return false;
    
    // Determinar si la respuesta es correcta (para devolverla, pero no se muestra al usuario)
    const isCorrect = exercise.correct_answer === selectedIndex;
    
    // Guardar la respuesta del usuario en el estado global
    exerciseState.userAnswers[exercise.id] = selectedIndex.toString();
    
    // Obtener todos los botones de opciones
    const optionButtons = document.querySelectorAll('.option-button');
    
    // Aplicar la clase 'selected' a la opción elegida
    optionButtons.forEach(btn => 
    {
        // Obtener el índice de la opción
        const btnIndex = parseInt(btn.dataset.option);
        
        // Quitar 'selected' de todas las opciones
        btn.classList.remove('selected');
        
        // SOLO aplicar 'selected' a la opción elegida
        if (btnIndex === selectedIndex) 
        {
            // Aplicar 'selected' a la opción elegida
            btn.classList.add('selected');
        }
        
        // Mantener todos los botones clickeables - usando atributo de datos
        btn.removeAttribute('disabled');
        
        // Aplicar 'disabled' a todos los botones
        btn.setAttribute('data-disabled', 'false');
    });
    
    // Actualizar la barra lateral
    renderSidebar();
    
    // Devolver si la respuesta fue correcta (aunque no se muestra al usuario)
    return isCorrect;
}

// Variable para almacenar referencias a los event listeners
let eventListenersSetup = false;

// Función para configurar los manejadores de eventos de los ejercicios
function setupExerciseEventListeners() 
{
    // Aplicar la clase 'selected' a opciones previamente seleccionadas
    const exerciseId = exerciseState.currentExerciseId;
    
    // Obtener la respuesta guardada para este ejercicio
    const selectedAnswer = exerciseState.userAnswers[exerciseId];
    
    // Si existe una respuesta guardada para este ejercicio, marcarla como seleccionada
    if (selectedAnswer !== undefined) 
    {
        // Obtener todos los botones de opciones
        const optionButtons = document.querySelectorAll('.option-button');
        
        // Recorrer todos los botones de opciones
        optionButtons.forEach(btn => 
        {
            // Obtener el índice de la opción
            const btnIndex = parseInt(btn.dataset.option);
            
            // Limpiar primero todas las selecciones
            btn.classList.remove('selected');
            
            // Aplicar 'selected' solo a la opción correspondiente a la respuesta guardada
            if (btnIndex === parseInt(selectedAnswer)) 
            {
                // Aplicar 'selected' a la opción correspondiente
                btn.classList.add('selected');
            }
        });
    }
    
    // Solo configurar listeners una vez para evitar duplicados
    if (!eventListenersSetup) {
        // Usar event delegation en el contenedor padre para evitar duplicados
        const exerciseContainer = document.getElementById('exercise-content');
        
        if (exerciseContainer) {
            // Delegated event listener para botones de navegación
            exerciseContainer.addEventListener('click', (e) => {
                // Botón anterior
                if (e.target.id === 'prev-exercise' || e.target.closest('#prev-exercise')) {
                    console.log('prev-exercise');
                    const currentIndex = exerciseState.exercises.findIndex(ex => ex.id === exerciseState.currentExerciseId);
                    
                    if (currentIndex > 0) {
                        renderExercise(exerciseState.exercises[currentIndex - 1].id);
                    }
                    return;
                }
                
                // Botón siguiente
                if (e.target.id === 'next-exercise' || e.target.closest('#next-exercise')) {
                    console.log('next-exercise');
                    const currentIndex = exerciseState.exercises.findIndex(ex => ex.id === exerciseState.currentExerciseId);
                    
                    if (currentIndex < exerciseState.exercises.length - 1) {
                        const nextExerciseId = exerciseState.exercises[currentIndex + 1].id;
                        renderExercise(nextExerciseId);
                    } else {
                        alert('¡Has completado todos los ejercicios!');
                    }
                    return;
                }
                
                // Botón Finalizar
                if (e.target.id === 'submit-answer' || e.target.closest('#submit-answer')) {
                    const exercise = exerciseState.exercises.find(ex => ex.id === exerciseState.currentExerciseId);
                    
                    if (!exercise) return;
                    
                    showConfirmationModal(
                        '¿Estás seguro de finalizar la práctica?',
                        'Una vez finalizada, no podrás volver a responder las preguntas.',
                        'Finalizar',
                        'Cancelar',
                        () => finishPractice('Por usuario')
                    );
                    return;
                }
            });
            
            eventListenersSetup = true;
        }
    }

    
    // Contenedor de opciones
    const optionsContainer = document.querySelector('.exercise-options');
    
    // Configurar el manejador de eventos
    optionsContainer.addEventListener('click', (e) => 
    {
        // Obtener el botón de opción más cercano
        const optionButton = e.target.closest('.option-button');
        
        // Si no se encuentra el botón de opción
        if (!optionButton) return;
        
        // En modo práctica, permitimos cambiar la respuesta
        if (optionButton.getAttribute('data-disabled') === 'true') return;
        
        // Obtener el índice de la opción seleccionada
        const selectedIndex = parseInt(optionButton.dataset.option);
        
        // Usamos la función checkAnswer que ya maneja correctamente el modo práctica
        checkAnswer(selectedIndex);
    });
}

// Función para renderizar la barra lateral con la lista de ejercicios
function renderSidebar() 
{
    // Intentar renderizar la barra lateral
    try 
    {
        // Obtener el contenedor de la barra lateral
        const sidebarContainer = document.getElementById('exercises-list');
        
        // Limpiar todo el contenido anterior de la barra lateral
        while (sidebarContainer.firstChild) 
        {
            // Eliminar el primer hijo del contenedor
            sidebarContainer.removeChild(sidebarContainer.firstChild);
        }
        
        // Contar los ejercicios completados
        const completedExercises = exerciseState.exercises.filter(ex => exerciseState.userAnswers[ex.id] !== undefined).length;
        
        // Contar el total de ejercicios
        const totalExercises = exerciseState.exercises.length;
        
        // Calcular el porcentaje de progreso
        const progressPercentage = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;
        
        // Obtener el elemento de la barra de progreso
        const progressBarFill = document.querySelector('.app-header .progress-bar-fill');
        
        // Obtener el elemento de texto de progreso
        const progressText = document.querySelector('.app-header .progress-text');
        
        // Actualizar la barra de progreso
        if (progressBarFill) 
        {
            // Actualizar el ancho de la barra de progreso
            progressBarFill.style.width = `${progressPercentage}%`;
        }
        
        // Actualizar el texto de la barra de progreso
        if (progressText) 
        {
            // Actualizar el texto de la barra de progreso
            progressText.textContent = `${progressPercentage}% Completado`;
        }
        
        // Iterar sobre todos los ejercicios disponibles
        exerciseState.exercises.forEach((exercise, index) => 
        {
            // Verificar que el ejercicio es válido
            if (!exercise || typeof exercise !== 'object') return;
            
            // Crear el elemento contenedor para el ítem de la barra lateral
            const exerciseItem = document.createElement('div');
            
            // Asignar clase CSS para estilizar el ítem
            exerciseItem.className = 'exercise-item';
            
            // Guardar el ID del ejercicio como atributo de datos
            exerciseItem.dataset.exerciseId = exercise.id;
            
            // Verificar si el ejercicio ya ha sido respondido
            const isCompleted = exerciseState.userAnswers[exercise.id] !== undefined;
            
            // Verificar si el ejercicio es correcto
            const isCorrect = isCompleted ? (exerciseState.userAnswers[exercise.id] === exercise.correct_answer) : false;
            
            // Si el ejercicio es el actual
            if (exerciseState.currentExerciseId && exercise.id === exerciseState.currentExerciseId) 
            {
                // Marcar el ítem como activo
                exerciseItem.classList.add('active');
            }
            
            // Marcar como completado o respondido
            if (isCompleted) 
            {
                // En modo práctica, marcar como "respondido" (azul)
                if (exerciseState.practiceMode.active) 
                {
                    // Marcar el ítem como respondido
                    exerciseItem.classList.add('answered');
                } 
                else 
                {
                    // En modo aprendizaje, marcar como correcto o incorrecto
                    exerciseItem.classList.add(isCorrect ? 'completed' : 'incorrect');
                }
            }
            
            // Crear el elemento de icono para el ítem
            const iconElement = document.createElement('div');
            
            // Asignar clase CSS para el icono
            iconElement.className = 'exercise-icon';

            // Añadir el icono de libro usando FontAwesome
            iconElement.innerHTML = `<i class="fas fa-book"></i>`;
            
            // Crear elemento para el título del ejercicio
            const titleElement = document.createElement('div');
            
            // Asignar clase CSS para el título
            titleElement.className = 'exercise-name';
            
            // Establecer el texto del título
            titleElement.textContent = `Ejercicio N° ${index + 1}`;
            
            // Añadir el icono al ítem
            exerciseItem.appendChild(iconElement);
            
            // Añadir el título al ítem
            exerciseItem.appendChild(titleElement);
            
            // Establecer rol de botón para accesibilidad
            exerciseItem.setAttribute('role', 'button');
            
            // Añadir etiqueta ARIA para accesibilidad
            exerciseItem.setAttribute('aria-label', `Ejercicio ${index + 1}`);
            
            // Agregar manejador de eventos para cuando se hace clic en el ejercicio
            exerciseItem.addEventListener('click', function(e) 
            {
                // Obtener el ID del ejercicio del atributo de datos
                const exerciseId = this.dataset.exerciseId;
                
                // Obtener todos los ítems de la barra lateral
                const allItems = sidebarContainer.querySelectorAll('.exercise-item');
                
                // Remover la clase 'active' de todos los ítems
                allItems.forEach(item => item.classList.remove('active'));
                
                // Añadir la clase 'active' al ítem actual
                this.classList.add('active');
                
                // Renderizar el ejercicio seleccionado
                renderExercise(Number(exerciseId));
                    
                // Hacer scroll al ejercicio seleccionado
                this.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
            
            // Añadir el ítem completo al contenedor de la barra lateral
            sidebarContainer.appendChild(exerciseItem);
        });
        
        // Si hay un ejercicio actualmente seleccionado, asegurarse de que esté visible
        if (exerciseState.currentExerciseId) 
        {
            // Obtener todos los ítems de la barra lateral
            const allItems = sidebarContainer.querySelectorAll('.exercise-item');
            
            // Recorrer todos los ítems para encontrar el activo
            allItems.forEach(item => 
            {
                // Verificar si este ítem corresponde al ejercicio actual
                if (Number(item.dataset.exerciseId) === exerciseState.currentExerciseId) 
                {
                    // Marcar este ítem como activo
                    item.classList.add('active');
                    
                    // Hacer scroll hasta este ítem para asegurar que está visible
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } 
            });
        }
        
        // Indicar que la operación fue exitosa
        return true;
    } 
    catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al intentar cargar la página. Por favor intentalo de nuevo.');
        
        // Redirigir a la página de error
        window.location.href = 'error.html';
    }
}

// Función para mostrar la pantalla de ejercicios
async function showExercises(topicId, topicName) 
{
    // Guardar el tema seleccionado en el estado
    exerciseState.selectedTopic = { id: topicId, name: topicName };
    
    // Obtener el tema seleccionado desde localStorage
    const storedTopic = JSON.parse(localStorage.getItem('selectedTopic'));
    
    // Obtener el título del tema
    const mainTopicTitle = storedTopic ? storedTopic.title : topicName;
    
    // Obtener el elemento del título del tema
    const topicTitle = document.getElementById('exercise-topic-title');
    
    // Asignar el título al elemento
     topicTitle.textContent = mainTopicTitle;
    
    // Cargar ejercicios del tema
    await loadTopicExercises(topicId);
    
    // Mostrar la pantalla de ejercicios
    showScreen('exercise-screen');
}

// Función para inicializar los anuncios de Google AdSense
function initializeAds() 
{
    //
    const adContainer = document.getElementById('ad-container');
    
    //
    if (!adContainer) return;
    
    // Iniciar la rotación de anuncios
    loadAd();
    
    // Configurar temporizador para rotar anuncios cada minuto
    exerciseState.adRotationTimer = setInterval(() => {
        loadAd();
    }, EXERCISE_SETTINGS.adRotationMinutes * 60 * 1000);
}

// Función para cargar un nuevo anuncio de AdSense
function loadAd() 
{
    //
    const adContainer = document.getElementById('ad-container');
    
    //
    if (!adContainer) return;
    
    // Limpiar contenedor anterior para asegurar la carga de un nuevo anuncio
    adContainer.innerHTML = '';
    
    // 
    const adElement = document.createElement('ins');
    
    //
    adElement.className = 'adsbygoogle';
    adElement.style.display = 'block';
    adElement.style.width = '100%';
    adElement.style.height = '90px'; // Altura estándar para banner horizontal
    adElement.setAttribute('data-ad-client', 'ca-pub-XXXXXXXXXXXXXXXX'); // Reemplazar con el ID de cliente real
    adElement.setAttribute('data-ad-slot', '1234567890'); // Reemplazar con el ID de slot real
    
    // Añadir al contenedor
    adContainer.appendChild(adElement);
    
    // Solicitar un nuevo anuncio a AdSense
    (window.adsbygoogle = window.adsbygoogle || []).push({});
}

// Función para limpiar recursos cuando el usuario sale de la página
function cleanupAds() 
{
    // Limpiar el temporizador si existe
    if (exerciseState.adRotationTimer) 
    {
        //
        clearInterval(exerciseState.adRotationTimer);
        
        //
        exerciseState.adRotationTimer = null;
    }
}

//
document.addEventListener('DOMContentLoaded', async () => 
{
    // Verificar autenticación
    const user = localStorage.getItem('user');
    
    // Obtener el tema seleccionado
    const topic = localStorage.getItem('selectedTopic');
    
    // Parsear el tema
    const selectedTopic = JSON.parse(topic);
    
    // Guardar el tema seleccionado en el estado
    exerciseState.selectedTopic = selectedTopic;
    
    // Actualizar el título del tema en el header
    const topicTitle = document.getElementById('exercise-topic-title');
    
    // Usar el título si existe, de lo contrario usar el nombre
    topicTitle.textContent = selectedTopic.title || selectedTopic.name;
    
    // Inicializar los anuncios de Google AdSense
    initializeAds();

    // Cargar los ejercicios
    await loadTopicExercises(selectedTopic.id);

    // Los event listeners ya se configuran en loadTopicExercises -> renderExercise -> setupExerciseEventListeners
    // No necesitamos llamarlo de nuevo aquí
    
    // Obtener duración de localStorage
    const durationPractice = localStorage.getItem('practiceDuration');  
 
    // Convertir la duración a un número entero (en minutos)
    let durationValue = parseInt(durationPractice, 10);
 
    // Inicializar el modo práctica con la duración (original o por defecto)
    initPracticeMode(durationValue);
    
    // Limpiar la duración para no inicializar automáticamente en futuras visitas
    localStorage.removeItem('practiceDuration');
});

// Función para inicializar el modo práctica
function initPracticeMode(durationMinutes) 
{    
    // Inicializar el objeto practiceMode
    exerciseState.practiceMode = 
    {
        // Indicar que el modo práctica está desactivado
        active: false,
        
        // Registrar la hora de inicio
        startTime: null,
        
        // Establecer la duración esperada
        expectedDuration: 0,
        
        // Establecer el tiempo restante
        remainingTime: 0,
        
        // Establecer el ID del temporizador
        timerId: null
    };
    
    // Activar el modo práctica
    exerciseState.practiceMode.active = true;
    
    // Establecer la duración esperada
    exerciseState.practiceMode.expectedDuration = durationMinutes;
    
    // Calcular el tiempo restante en segundos
    exerciseState.practiceMode.remainingTime = durationMinutes * 60;
    
    // Registrar la hora de inicio
    exerciseState.practiceMode.startTime = new Date();
    
    // Crear el elemento del cronómetro si no existe
    createTimerElement();

    //
    startTimer();
}

// Función para crear el elemento del cronómetro en la UI
function createTimerElement() 
{
    // Verificar si ya existe un cronómetro
    const existingTimer = document.getElementById('practice-timer');
    
    // Si ya existe un cronómetro
    if (existingTimer) 
    {
        // Salir de la función
        return;
    }
    
    // Intentar crear el cronómetro
    try 
    {
        // Crear el contenedor del cronómetro
        const timerContainer = document.createElement('div');
        
        // Asignar ID al contenedor
        timerContainer.id = 'practice-timer';
        
        // Asignar clase al contenedor
        timerContainer.className = 'practice-timer';
        
        // Icono del cronómetro
        const timerIcon = document.createElement('i');
        
        // Asignar clase al icono
        timerIcon.className = 'fas fa-clock timer-icon';
        
        // Texto del cronómetro
        const timerText = document.createElement('span');
        
        // Asignar ID al texto
        timerText.id = 'timer-text';
        
        // Asignar clase al texto
        timerText.className = 'timer-text';
        
        // Asignar el tiempo restante al texto
        timerText.innerText = formatTime(exerciseState.practiceMode.remainingTime);
        
        // Añadir el icono al contenedor
        timerContainer.appendChild(timerIcon);
        
        // Añadir el texto al contenedor
        timerContainer.appendChild(timerText);
        
        // Buscar el elemento header-right donde insertaremos el temporizador
        const headerRight = document.querySelector('.header-right');
        
            // Insertar el temporizador al principio del header-right (antes del botón)
            headerRight.insertBefore(timerContainer, headerRight.firstChild);        
    } 
    catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al cargar el temporizador. Por favor intentalo de nuevo.');

        // Redirigir a la página de error
        window.location.href = 'error.html';
    }
}

// Función para formatear el tiempo en formato MM:SS
function formatTime(seconds) 
{
    // Calcular minutos
    const minutes = Math.floor(seconds / 60);
    
    // Calcular segundos restantes
    const remainingSeconds = seconds % 60;
    
    // Formatear el tiempo
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Función para iniciar el cronómetro
function startTimer() 
{
    // Limpiar cualquier temporizador existente
    if (exerciseState.practiceMode.timerId) 
    {
        // Limpiar el temporizador
        clearInterval(exerciseState.practiceMode.timerId);
    }
    
    // Actualizar el cronómetro cada segundo
    exerciseState.practiceMode.timerId = setInterval(() => 
    {
        // Decrementar el tiempo restante
        exerciseState.practiceMode.remainingTime--;
        
        // Actualizar el texto del cronómetro
        const timerText = document.getElementById('timer-text');
        
        // Actualizar el texto del cronómetro
        timerText.innerText = formatTime(exerciseState.practiceMode.remainingTime);
        
        // Cambiar el color cuando queden menos de 60 segundos
        if (exerciseState.practiceMode.remainingTime <= 60) 
        {
            // Añadir el color de advertencia
            timerText.classList.add('timer-text-alert');
        } 
        else 
        {
            // Quitar el color de advertencia
            timerText.classList.remove('timer-text-alert');
        }
        
        // Si se acabó el tiempo, finalizar la práctica
        if (exerciseState.practiceMode.remainingTime <= 0) 
        { 
            // Limpiar el temporizador
            clearInterval(exerciseState.practiceMode.timerId);
            
            // Finalizar la práctica
            finishPractice('Por tiempo');
        }
    }, 1000);
}

// Función para detener el cronómetro
function stopTimer() 
{
    // Limpiar el temporizador
    clearInterval(exerciseState.practiceMode.timerId);
    
    // Asignar null al temporizador
    exerciseState.practiceMode.timerId = null;
}

// Función para mostrar un modal de confirmación
function showConfirmationModal(title, message, confirmText, cancelText, confirmCallback) 
{
    // Verificar si ya existe un modal en la página
    let modalOverlay = document.getElementById('modal-overlay');
    
    // Si ya existe un modal, eliminarlo
    if (modalOverlay) 
    {
        // Eliminar el modal
        document.body.removeChild(modalOverlay);
    }
    
    // Crear el overlay (fondo oscurecido)
    modalOverlay = document.createElement('div');
    
    // Asignar ID al overlay
    modalOverlay.id = 'modal-overlay';
    
    // Crear el contenedor del modal
    const modalContainer = document.createElement('div');
    
    // Asignar clase al contenedor
    modalContainer.className = 'modal-container';
    
    // Crear el título del modal
    const modalTitle = document.createElement('h3');
    
    // Asignar el título al modal
    modalTitle.textContent = title;
    
    // Asignar clase al título
    modalTitle.className = 'modal-title';
    
    // Crear el mensaje del modal
    const modalMessage = document.createElement('p');
    
    // Asignar el mensaje al modal
    modalMessage.textContent = message;
    
    // Asignar clase al mensaje
    modalMessage.className = 'modal-message';
    
    // Crear el contenedor de botones
    const buttonContainer = document.createElement('div');
    
    // Asignar clase al contenedor de botones
    buttonContainer.className = 'modal-buttons';
    
    // Crear el botón de cancelar
    const cancelButton = document.createElement('button');
    
    // Asignar el texto al botón de cancelar
    cancelButton.textContent = cancelText;
    
    // Asignar clase al botón de cancelar
    cancelButton.className = 'btn btn-cancel';
    
    // Crear el botón de confirmar
    const confirmButton = document.createElement('button');
    
    // Asignar el texto al botón de confirmar
    confirmButton.textContent = confirmText;
    
    // Asignar clase al botón de confirmar
    confirmButton.className = 'btn btn-confirm';
    
    // Añadir evento al botón de cancelar
    cancelButton.addEventListener('click', () => 
    {
        // Eliminar el modal
        document.body.removeChild(modalOverlay);
    });
    
    // Añadir evento al botón de confirmar
    confirmButton.addEventListener('click', () => 
    {
        // Eliminar el modal
        document.body.removeChild(modalOverlay);
        
        // Ejecutar la función de confirmación
        if (typeof confirmCallback === 'function') 
        {
            // Ejecutar la función de confirmación
            confirmCallback();
        }
    });
    
    // Ensamblar el modal
    buttonContainer.appendChild(cancelButton);
    
    // Añadir el botón de confirmar al contenedor
    buttonContainer.appendChild(confirmButton);
    
    // Añadir el título al contenedor
    modalContainer.appendChild(modalTitle);
    
    // Añadir el mensaje al contenedor
    modalContainer.appendChild(modalMessage);
    
    // Añadir el contenedor de botones al contenedor
    modalContainer.appendChild(buttonContainer);
    
    // Añadir el contenedor al overlay
    modalOverlay.appendChild(modalContainer);
    
    // Añadir el modal al documento
    document.body.appendChild(modalOverlay);
}

// Función para finalizar la práctica
async function finishPractice(finishReason = 'Por usuario') 
{
    // Bloque try-catch para manejar posibles errores al momento de intentar finalizar las práctica
    try
    {
        // Detener el temporizador
        stopTimer();
        
        // Calcular resultados pasando el motivo de finalización
        const results = calculateResults(finishReason);
        
        // Asignar el motivo de finalización
        results.finishReason = finishReason; // Aseguramos que el motivo de finalización se guarde
        
        // Mostrar la pantalla de resultados inmediatamente para mejor UX
        showResultsScreen(results);
        
        // Obtener el usuario actual del localStorage (como estaba originalmente)
        const userStr = localStorage.getItem('user');
        
        // Parseamos el usuario
        const user = JSON.parse(userStr);
        
        // Simplificamos el objeto de detalles para evitar problemas de serialización
        const simplifiedResults = [];
        
        // Recorremos los resultados
        results.exerciseResults.forEach(result => 
        {
            // Añadimos el resultado simplificado
            simplifiedResults.push({
                exerciseId: result.exerciseId,
                questionText: result.questionText,
                userAnswer: result.userAnswer,
                correctAnswer: result.correctAnswer,
                isCorrect: result.isCorrect
            });
        });
        
        // Obtenemos el course_id del tema actual o del ejercicio
        let courseId = null;
            
        // Obtenemos el course_id del tema actual
        courseId = exerciseState.selectedTopic.courseId;
        
        // Calculamos la hora de fin adecuada según el tipo de finalización
        let endTime = new Date();
        
        // Si la finalización fue por tiempo, calculamos el fin exacto como inicio + duración programada
        if (finishReason === 'Por tiempo') 
        {
            // Obtenemos la duración programada en milisegundos
            const durationMs = exerciseState.practiceMode.expectedDuration * 60 * 1000; // Convertir minutos a milisegundos
            
            // Calculamos la hora de fin como inicio + duración programada
            endTime = new Date(exerciseState.practiceMode.startTime.getTime() + durationMs);
        }
        
        // Creamos el objeto de datos para guardar
        const testData = 
        {
            // ID del usuario
            user_id: user.id,
            
            // ID del tema
            topic_id: Number(results.topicId), // Asegurar que es número
            
            // ID del curso
            course_id: Number(courseId), // Añadir course_id que es requerido según el error
            
            // Campos de tiempo
            start_time: exerciseState.practiceMode.startTime.toISOString(),
            
            // Fecha de finalización
            end_time: endTime.toISOString(),
            
            // Duración esperada
            expected_duration: Number(results.expectedDuration), // La duración esperada en minutos
            
            // Información sobre la prueba
            completion_type: finishReason,
            
            // Total de ejercicios
            total_questions: Number(results.totalExercises), // Asegurar que es número
            
            // Total de respuestas correctas
            correct_answers: Number(results.correct) // Asegurar que es número
        };
        
        // Llamar a la función saveUserTest de supabase.js
        await saveUserTest(testData);
    }
    catch (error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Ocurrió un error al intentar guardar tus resultados. Por favor intentalo de nuevo.');
                
        // Redirigir a la página de error
        window.location.href = 'error.html';
    }
}

// Función para calcular los resultados de la práctica
function calculateResults(finishReason = 'Por usuario') 
{
    // Obtenemos el inicio de la práctica
    const startTime = exerciseState.practiceMode.startTime;
    
    // Obtenemos el fin de la práctica
    const endTime = new Date();
    
    // Obtenemos el tiempo tomado
    let timeTaken = Math.floor((endTime - startTime) / 1000); // Tiempo en segundos
    
    // Si la finalización fue por tiempo, ajustamos el tiempo tomado al tiempo programado
    if (finishReason === 'Por tiempo') 
    {
        // Si finalizó por tiempo, usamos exactamente el tiempo programado (en segundos)
        timeTaken = exerciseState.practiceMode.expectedDuration * 60;
    }
    
    // Obtenemos el total de ejercicios
    const totalExercises = exerciseState.exercises.length;
    
    // Obtenemos el total de respuestas
    let answered = 0;
    
    // Obtenemos el total de respuestas correctas
    let correct = 0;
    
    // Obtenemos el total de respuestas incorrectas
    let incorrect = 0;
    
    // Obtenemos el total de respuestas incorrectas
    const exerciseResults = [];
    
    // Recorremos los ejercicios
    exerciseState.exercises.forEach(exercise => 
    {
        // Obtenemos la respuesta del usuario
        const userAnswer = exerciseState.userAnswers[exercise.id];
        
        // Convertir ambos valores a string para comparación segura
        const userAnswerStr = userAnswer !== undefined ? userAnswer.toString() : undefined;
        
        // Obtenemos la respuesta correcta
        const correctAnswerStr = exercise.correct_answer.toString();
        
        // Obtenemos el resultado
        const result = 
        {
            exerciseId: exercise.id,
            questionText: exercise.question,
            userAnswer: userAnswerStr,
            correctAnswer: correctAnswerStr,
            isCorrect: userAnswerStr === correctAnswerStr,
            allOptions: exercise.options
        };
        
        // Actualizar contadores
        if (userAnswerStr !== undefined) 
        {
            // Obtenemos el total de respuestas
            answered++;
            
            // Obtenemos el total de respuestas correctas
            if (result.isCorrect) 
            {
                // Obtenemos el total de respuestas correctas
                correct++;
            } 
            else 
            {
                // Obtenemos el total de respuestas incorrectas
                incorrect++;
            }
        }
        
        // Obtenemos el total de respuestas
        exerciseResults.push(result);
    });
    
    // Obtenemos el total de respuestas
    const score = totalExercises > 0 ? Math.round((correct / totalExercises) * 100) : 0;
    
    // Obtenemos el porcentaje de respuestas
    const answeredPercent = totalExercises > 0 ? Math.round((answered / totalExercises) * 100) : 0;
    
    // Obtenemos el nombre del tema
    const topicTitle = exerciseState.selectedTopic.title || exerciseState.selectedTopic.name || 'Sin nombre';
    
    // Obtenemos el resultado
    return {
        topicId: exerciseState.selectedTopic.id,
        topicName: topicTitle,
        totalExercises,
        answered,
        skipped: totalExercises - answered,
        correct,
        incorrect,
        score,
        answeredPercent,
        timeTaken,
        expectedDuration: exerciseState.practiceMode.expectedDuration, // La duración esperada en minutos
        exerciseResults
    };
}

// Función para mostrar la pantalla de resultados
function showResultsScreen(results) 
{
    // Obtenemos el contenedor de contenido
    const contentContainer = document.querySelector('.content-container');

    // Ocultamos el contenedor de contenido
    if (contentContainer) 
    {
        // Ocultamos el contenedor de contenido
        contentContainer.classList.add('hidden');
    }
    
    // Obtenemos el contenedor de resultados
    const existingResults = document.querySelector('#results-screen');

    // Eliminamos el contenedor de resultados
    if (existingResults) 
    {
        // Eliminamos el contenedor de resultados
        existingResults.remove();
    }
    
    // Obtenemos el contenedor de resultados
    const resultsScreen = document.createElement('div');
    
    // Asignamos un ID al contenedor de resultados
    resultsScreen.id = 'results-screen';
    
    // Asignamos una clase al contenedor de resultados
    resultsScreen.className = 'results-screen';
    
    // Obtenemos el contenedor de resultados
    const resultsHeader = document.createElement('div');
    
    // Asignamos una clase al contenedor de resultados
    resultsHeader.className = 'results-header';
    
    // Obtenemos el título de los resultados
    const resultsTitle = document.createElement('h2');
    
    // Asignamos un texto al título de los resultados
    resultsTitle.textContent = 'Resultados de la Práctica';
    
    // Asignamos una clase al título de los resultados
    resultsTitle.className = 'results-title';
    
    // Obtenemos el nombre del tema
    const topicName = document.createElement('h3');
    
    // Asignamos un texto al nombre del tema
    topicName.textContent = `Tema: ${results.topicName}`;
    
    // Asignamos una clase al nombre del tema
    topicName.className = 'results-topic-name';
    
    // Agregamos el título y el nombre del tema al contenedor de resultados
    resultsHeader.appendChild(resultsTitle);
    
    // Agregamos el nombre del tema al contenedor de resultados
    resultsHeader.appendChild(topicName);
    
    // Crear la tarjeta de estadísticas
    const statsCard = document.createElement('div');
    
    // Asignamos una clase a la tarjeta de estadísticas
    statsCard.className = 'stats-card';
    
    // Crear cuadrícula de estadísticas
    const statsGrid = document.createElement('div');
    
    // Asignamos una clase a la cuadrícula de estadísticas
    statsGrid.className = 'stats-grid';
    
    // Definir los elementos de estadísticas
    const statsItems = [
        {
            label: 'Puntuación',
            value: `${results.score}%`,
            icon: 'fa-star',
            colorClass: results.score >= 70 ? 'color-green' : results.score >= 40 ? 'color-orange' : 'color-red'
        },
        {
            label: 'Respondidas',
            value: `${results.answered} / ${results.totalExercises}`,
            icon: 'fa-check-circle',
            colorClass: 'color-blue'
        },
        {
            label: 'Correctas',
            value: `${results.correct}`,
            icon: 'fa-check',
            colorClass: 'color-green'
        },
        {
            label: 'Incorrectas',
            value: `${results.incorrect}`,
            icon: 'fa-times',
            colorClass: 'color-red'
        },
        {
            label: 'Tiempo Real',
            value: formatDuration(results.timeTaken),
            icon: 'fa-clock',
            colorClass: 'color-purple'
        },
        {
            label: 'Duración Programada',
            value: `${results.expectedDuration} m 0 s`, // Formato directo para minutos
            icon: 'fa-hourglass-end',
            colorClass: 'color-grey'
        }
    ];
    
    // Agregar cada elemento de estadísticas a la cuadrícula
    statsItems.forEach(item => 
    {
        // Obtenemos el contenedor de estadísticas
        const statItem = document.createElement('div');
        
        // Asignamos una clase al contenedor de estadísticas
        statItem.className = 'stat-item';
        
        // Obtenemos el icono de estadísticas
        const statIcon = document.createElement('i');
        
        // Asignamos una clase al icono de estadísticas
        statIcon.className = `fas ${item.icon} stat-icon ${item.colorClass}`;
        
        // Obtenemos el valor de estadísticas
        const statValue = document.createElement('div');
        
        // Asignamos un texto al valor de estadísticas
        statValue.textContent = item.value;
        
        // Asignamos una clase al valor de estadísticas
        statValue.className = `stat-value ${item.colorClass}`;
        
        // Obtenemos el texto de estadísticas
        const statLabel = document.createElement('div');
        
        // Asignamos un texto al texto de estadísticas
        statLabel.textContent = item.label;
        
        // Asignamos una clase al texto de estadísticas
        statLabel.className = 'stat-label';
        
        // Agregamos el icono al contenedor de estadísticas
        statItem.appendChild(statIcon);
        
        // Agregamos el valor al contenedor de estadísticas
        statItem.appendChild(statValue);
        
        // Agregamos el texto al contenedor de estadísticas
        statItem.appendChild(statLabel);
        
        // Agregamos el contenedor de estadísticas a la cuadrícula
        statsGrid.appendChild(statItem);
    });
    
    // Agregamos la cuadrícula a la tarjeta de estadísticas
    statsCard.appendChild(statsGrid);
    
    // Botón para volver a la pantalla de ejercicios
    const backButton = document.createElement('button');
    
    // Asignamos una clase al botón
    backButton.className = 'back-button';
    
    // Asignamos un texto al botón
    backButton.textContent = 'Volver al inicio';
    
    // Asignamos un evento al botón
    backButton.addEventListener('click', () => 
    {
        // Redirigimos a la pantalla de temas
        window.location.href = 'topics.html';
    });
    
    // Agregamos el contenedor de resultados a la pantalla de ejercicios
    resultsScreen.appendChild(resultsHeader);
    
    // Agregamos la tarjeta de estadísticas al contenedor de resultados
    resultsScreen.appendChild(statsCard);
    
    // Agregamos el botón al contenedor de resultados
    resultsScreen.appendChild(backButton);
    
    // Obtenemos el contenedor de ejercicios
    const exerciseScreen = document.querySelector('#exercise-screen');
    
    // Obtenemos el encabezado de la aplicación
    const header = document.querySelector('.app-header');
    
    // Insertamos el contenedor de resultados antes del encabezado
    exerciseScreen.insertBefore(resultsScreen, header.nextSibling);
}

// Función auxiliar para formatear duraciones de tiempo
function formatDuration(seconds) 
{
    // Obtenemos los minutos
    const minutes = Math.floor(seconds / 60);
    
    // Obtenemos los segundos restantes
    const remainingSeconds = seconds % 60;
    
    // Retornamos la duración formateada
    return `${minutes} m ${remainingSeconds} s`;
}

// Limpiar recursos cuando el usuario abandona la página
window.addEventListener('beforeunload', cleanupAds);

// Exportar funciones públicas
export 
{ 
    showExercises, 
    initPracticeMode 
};
