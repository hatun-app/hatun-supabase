// Módulo para la página de aprendizaje

// Importamos los módulos necesarios
import { getExercises } from './supabase.js';
import { showScreen } from './utils.js';

// Configuración global para los ejercicios
const EXERCISE_SETTINGS = 
{
    // Tiempo en minutos para la rotación de anuncios publicitarios
    adRotationMinutes: 1
};

// Estado global de los ejercicios
const exerciseState = 
{
    // ID del ejercicio actualmente mostrado o activo
    currentExerciseId: null,
    
    // Lista de ejercicios cargados para el tema actual
    exercises: [],
    
    // Objeto que almacena las respuestas del usuario por ejercicio
    userAnswers: {},
    
    // Objeto con información del tema actualmente seleccionado
    selectedTopic: null,
    
    // Bandera que indica si se están cargando ejercicios
    isLoading: false,
    
    // Referencia al temporizador de rotación de anuncios
    adRotationTimer: null,
    
    // Índice actual del anuncio mostrado
    currentAdIndex: 0
};

// Función para cargar los ejercicios de un tema específico y mostrarlos en la interfaz
async function loadTopicExercises(topicId) 
{
    // Intenta ejecutar el flujo principal de carga de ejercicios
    try 
    {
        // Marca el estado como "cargando" para mostrar loaders o deshabilitar controles
        exerciseState.isLoading = true;
        
        // Llama a la función que obtiene los ejercicios desde Supabase
        const exercises = await getExercises(topicId);

        // Actualiza el estado global con la lista de ejercicios obtenidos (o vacío si hay error)
        exerciseState.exercises = Array.isArray(exercises) ? exercises : [];
        
        // Selecciona el primer ejercicio como el "activo"
        exerciseState.currentExerciseId = exerciseState.exercises[0].id;
        
        // Llama a la función que renderiza el ejercicio seleccionado en la interfaz
        renderExercise(exerciseState.currentExerciseId);
    
        // Renderizar la barra lateral con la lista de ejercicios
        renderSidebar();
        
        // Devuelve la lista de ejercicios
        return exercises;
    } 
    catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al intentar cargar los ejercicios. Por favor intentalo de nuevo.');
        
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    } 
}

// Función para renderizar un ejercicio específico en la interfaz
function renderExercise(exerciseId) 
{
    // Convierte el parámetro a número para comparar correctamente
    const exerciseIdNum = Number(exerciseId);
    
    // Busca el ejercicio correspondiente en el estado global
    const exercise = exerciseState.exercises.find(ex => ex.id === exerciseIdNum);
    
    // Obtiene el contenedor principal donde se mostrará el ejercicio
    const exerciseContainer = document.getElementById('exercise-content');
    
    // Si no existe el contenedor, termina la función (no hay dónde renderizar)
    if (!exerciseContainer) return;
    
    // Actualiza el estado global para indicar cuál es el ejercicio actual
    exerciseState.currentExerciseId = exerciseIdNum;
    
    // Genera el HTML principal del ejercicio (pregunta, opciones, explicación)
    let exerciseHTML = `
            <div class="question-container">${exercise.question || 'No hay pregunta disponible'}</div>
            
            <div class="exercise-options">
                ${exercise.options && exercise.options.length > 0 ? exercise.options.map((option, index) => {
                    // Determina si el usuario ya respondió este ejercicio
                    const userAnswer = exerciseState.userAnswers[exerciseId];
    
                    // Indica si el usuario ya respondió
                    const isAnswered = userAnswer !== undefined;
                    
                    // Determina si esta opción es la seleccionada
                    const isSelected = isAnswered && userAnswer === index.toString();
                    
                    // Obtiene el índice de la respuesta correcta
                    const correctAnswer = exercise.correct_answer;
                    
                    // Determina si la opción seleccionada es correcta o incorrecta
                    const isCorrect = isAnswered && isSelected && (index === correctAnswer);
                    
                    // Indica si la opción seleccionada es incorrecta
                    const isIncorrect = isAnswered && isSelected && (index !== correctAnswer);
                    
                    // Determina si esta opción es la correcta (sin importar si fue seleccionada)
                    const isCorrectAnswer = isAnswered && (index === correctAnswer);
                    
                    // Define las clases CSS del botón según el estado de respuesta
                    let buttonClasses = 'option-button';
                    
                    // Si el usuario ya respondió
                    if (isAnswered) 
                    {
                        // Si la respuesta es correcta
                        if (isCorrectAnswer) buttonClasses += ' correct';
                        
                        // Si la respuesta es incorrecta
                        else if (isIncorrect) buttonClasses += ' incorrect';
                    }
                    
                    // Define el contenido visual de la "letra" del botón (A, B, ✔, ✖)
                    let letterContent = String.fromCharCode(65 + index);
                    
                    // Define el estilo de la "letra" del botón
                    let letterStyle = '';
                    
                    // Si el usuario ya respondió
                    if (isAnswered) 
                    {
                        // Si la respuesta es correcta
                        if (isCorrectAnswer) 
                        {
                            // Marca verde
                            letterContent = '✔'; 
                            
                            // Estilo verde
                            letterStyle = 'color: white; background-color: #4caf50;';
                        } 
                        else if (isIncorrect) 
                        {
                            // Marca roja
                            letterContent = '✖'; 
                            
                            // Estilo rojo
                            letterStyle = 'color: white; background-color: #f44336;';
                        }
                    }
                    
                    // Define si el botón es interactivo o no
                    const pointerEvents = isAnswered ? 'none' : 'auto';
                    
                    // Define si el botón está deshabilitado
                    const dataDisabled = isAnswered ? 'true' : 'false';
                    
                    // Genera el HTML del botón
                    return `
                    <button class="${buttonClasses}" 
                            data-option="${index}"
                            style="pointer-events: ${pointerEvents}"
                            data-disabled="${dataDisabled}"
                            ${isSelected ? 'data-selected="true"' : ''}>
                        <span class="option-letter" style="${letterStyle}">${letterContent}</span>
                        <span class="option-text">${option}</span>
                    </button>
                    `;
                }).join('') : '<p>No hay opciones disponibles</p>'}
            </div>
            
            <div class="explanation-container" id="explanation-container" style="display: ${exerciseState.userAnswers[exerciseId] !== undefined ? 'block' : 'none'}">
                <h4>Explicación:</h4>
                <p class="explanation-text" id="explanation-text">${exercise.explanation || 'No hay explicación disponible'}</p>
            </div>
    `;
    
    // Calcula el índice del ejercicio actual para navegación
    const currentIndex = exerciseState.exercises.findIndex(ex => ex.id === exerciseIdNum);
    
    // Determina si es el primer ejercicio (para deshabilitar botón "Anterior")
    const isFirstExercise = currentIndex === 0;
    
    // Determina si es el último ejercicio (para deshabilitar botón "Siguiente")
    const isLastExercise = currentIndex === exerciseState.exercises.length - 1;
    
    // Añade los botones de navegación y acción debajo de las opciones
    exerciseHTML += `
        <div class="button-row">
            <button id="prev-exercise" class="button prev-button" ${isFirstExercise ? 'disabled' : ''}>
                <i class="fas fa-arrow-left"></i> Anterior
            </button>
            <button id="submit-answer" class="button primary-button">
                Verificar respuesta
            </button>
            <button id="next-exercise" class="button next-button" ${isLastExercise ? 'disabled' : ''}>
                Siguiente <i class="fas fa-arrow-right"></i>
            </button>
        </div>
    `;
    
    // Inserta el HTML generado en el contenedor principal del ejercicio
    exerciseContainer.innerHTML = exerciseHTML;
    
    // Inicializa el botón de verificación de respuesta
    const verifyButton = document.getElementById('submit-answer');
    
    // Si existe el botón, ajusta su estado y texto según si ya hay respuesta
    if (verifyButton) 
    {
        // Verifica si este ejercicio ya tiene respuesta registrada
        const hasAnswer = exerciseState.userAnswers[exerciseId] !== undefined;
        
        // Si no hay respuesta, deshabilita el botón
        verifyButton.disabled = !hasAnswer;
        
        // El texto siempre es "Ver explicación"
        verifyButton.textContent = 'Ver explicación';
    }
    
    // Obtiene el contenedor y el texto de la explicación, si existen
    const explanationContainer = document.getElementById('explanation-container');
    
    // Obtiene el texto de la explicación, si existe
    const explanationContent = document.getElementById('explanation-text');
    
    // Si ambos existen, se podrían realizar acciones adicionales (por ejemplo, mostrar/ocultar explicación)
    if (explanationContainer && explanationContent) 
    {
        // Oculta el contenedor de explicación
        explanationContainer.style.display = 'none';
        
        // Limpia el contenido del texto de explicación
        explanationContent.innerHTML = '';

        // Asigna la explicación al contenedor
        explanationContent.innerHTML = exercise.explanation;
    }
    
    // Configura los listeners para los eventos del ejercicio
    setupExerciseEventListeners();
    
    // Renderiza la barra lateral
    renderSidebar();
}

// Función para verificar la respuesta seleccionada por el usuario
function checkAnswer(selectedIndex) 
{
    // Obtiene el ID del ejercicio actualmente activo
    const exerciseId = exerciseState.currentExerciseId;
    
    // Busca el objeto del ejercicio correspondiente en el estado global
    const exercise = exerciseState.exercises.find(ex => ex.id === exerciseId);
    
    // Si no se encuentra el ejercicio, termina la función y retorna falso
    if (!exercise) return false;
    
    // Determina si la respuesta seleccionada es la correcta
    const isCorrect = exercise.correct_answer === selectedIndex;
    
    // Guarda la respuesta del usuario como cadena de texto (para consistencia y control de estado)
    exerciseState.userAnswers[exercise.id] = selectedIndex.toString();
    
    // Obtiene todos los botones de opciones en la interfaz para actualizarlos visualmente
    const optionButtons = document.querySelectorAll('.option-button');
    
    // Recorre cada botón para actualizar su estado visual según la respuesta
    optionButtons.forEach(btn => 
    {
        // Obtiene el índice de opción de este botón desde su dataset
        const btnIndex = parseInt(btn.dataset.option);
        
        // Obtiene el span que muestra la letra o símbolo de la opción (A, B, ✔, ✖)
        const letterSpan = btn.querySelector('.option-letter');
        
        // Elimina clases previas de selección/corrección para limpiar el estado visual
        btn.classList.remove('selected', 'correct', 'incorrect');
        
        // Restaura la letra original (A, B, C, ...) antes de mostrar símbolos de feedback
        if (letterSpan) 
        {
            // Restaura la letra original (A, B, C, ...)
            letterSpan.textContent = String.fromCharCode(65 + btnIndex);
            
            // Muestra la letra original
            letterSpan.style.display = 'flex';
        }
        
        // Si este botón corresponde a la opción seleccionada por el usuario...
        if (btnIndex === selectedIndex) 
        {
            // Si la respuesta es correcta...
            if (isCorrect) 
            {
                // Marca el botón como correcto (verde)
                btn.classList.add('correct');
                
                // Si existe el span que muestra la letra o símbolo de la opción (A, B, ✔, ✖)
                if (letterSpan) 
                {
                    // Cambia el texto del span por el símbolo de correcto (✔)
                    letterSpan.textContent = '✔';
                    
                    // Cambia el color del texto a blanco
                    letterSpan.style.color = 'white';
                    
                    // Cambia el color de fondo a verde
                    letterSpan.style.backgroundColor = '#4caf50';
                }
            } 
            else 
            {
                // Marca el botón como incorrecto (rojo)
                btn.classList.add('incorrect');
                
                // Si existe el span que muestra la letra o símbolo de la opción (A, B, ✔, ✖)
                if (letterSpan) 
                {
                    // Cambia el texto del span por el símbolo de incorrecto (✖)
                    letterSpan.textContent = '✖';
                    
                    // Cambia el color del texto a blanco
                    letterSpan.style.color = 'white';
                    
                    // Cambia el color de fondo a rojo
                    letterSpan.style.backgroundColor = '#f44336';
                }
            }
        }
        
        // Si este botón corresponde a la opción correcta (se marca siempre aunque no haya sido seleccionada)
        if (btnIndex === exercise.correct_answer) 
        {
            // Marca el botón como correcto (verde)
            btn.classList.add('correct');
            
            // Si existe el span que muestra la letra o símbolo de la opción (A, B, ✔, ✖)
            if (letterSpan) 
            {
                // Cambia el texto del span por el símbolo de correcto (✔)
                letterSpan.textContent = '✔';
                
                // Cambia el color del texto a blanco
                letterSpan.style.color = 'white';
                
                // Cambia el color de fondo a verde
                letterSpan.style.backgroundColor = '#4caf50';
            }
        }
        
        // Deshabilita el botón para evitar cambios tras responder
        btn.style.pointerEvents = 'none';
        
        // Marca el botón como deshabilitado
        btn.setAttribute('data-disabled', 'true');
    });
    
    // Obtiene el botón de verificación de respuesta
    const verifyButton = document.getElementById('submit-answer');
    
    // Si existe, lo habilita y actualiza el texto para permitir ver la explicación
    if (verifyButton) 
    {
        // El botón siempre disponible tras responder
        verifyButton.disabled = false;
        
        // El texto siempre es "Ver explicación"
        verifyButton.textContent = 'Ver explicación';
    }
    
    // Actualiza la barra lateral para reflejar el estado del ejercicio actual
    renderSidebar();
    
    // Este es un paso adicional para asegurar que la visualización sea correcta
    const sidebarItems = document.querySelectorAll('.exercise-item');
    
    // Recorre cada ítem de la barra lateral
    sidebarItems.forEach(item => 
    {
        // Obtiene el ID del ejercicio correspondiente al ítem
        const itemId = parseInt(item.dataset.exerciseId);
        
        // Si el ejercicio ya tiene respuesta registrada
        if (exerciseState.userAnswers[itemId] !== undefined) 
        {
            // Marca el ítem como respondido
            item.classList.add('answered');
            
            // Cambia el color de fondo del ítem
            item.style.backgroundColor = 'rgba(33, 150, 243, 0.15)';
            
            // Cambia el color del borde izquierdo del ítem
            item.style.borderLeft = '3px solid #2196f3';
            
            // Añade una sombra al ítem
            item.style.boxShadow = '0 2px 5px rgba(33, 150, 243, 0.2)';
            
            // Obtiene el elemento del ícono del ejercicio
            const iconElement = item.querySelector('.exercise-icon');
            
            // Cambia el color de fondo del ícono
            iconElement.style.backgroundColor = '#2196f3';
            
            // Añade una sombra al ícono
            iconElement.style.boxShadow = '0 3px 6px rgba(33, 150, 243, 0.3)';
            
            // Obtiene el elemento del nombre del ejercicio
            const nameElement = item.querySelector('.exercise-name');
            
            // Cambia el color del texto del nombre del ejercicio
            nameElement.style.color = '#0d47a1';
        }
    });
    
    // Retorna si la respuesta es correcta
    return isCorrect;
}

// Función para configurar los manejadores de eventos de los ejercicios
function setupExerciseEventListeners() 
{
    // Configura el evento para el botón "Anterior" (navega al ejercicio previo)
    document.getElementById('prev-exercise')?.addEventListener('click', () => 
    {
        // Obtiene el índice del ejercicio actual
        const currentIndex = exerciseState.exercises.findIndex(ex => ex.id === exerciseState.currentExerciseId);
        
        // Si no es el primer ejercicio, renderiza el anterior
        if (currentIndex > 0) 
        {
            // Renderiza el ejercicio anterior
            renderExercise(exerciseState.exercises[currentIndex - 1].id);
        }
    });
    
    // Configura el evento para el botón "Siguiente" (navega al siguiente ejercicio)
    document.getElementById('next-exercise')?.addEventListener('click', () => 
    {
        // Obtiene el índice del ejercicio actual
        const currentIndex = exerciseState.exercises.findIndex(ex => ex.id === exerciseState.currentExerciseId);
        
        // Si no es el último, renderiza el siguiente; si es el último, muestra alerta
        if (currentIndex < exerciseState.exercises.length - 1) 
        {
            // Renderiza el ejercicio siguiente
            renderExercise(exerciseState.exercises[currentIndex + 1].id);
        } 
        else 
        {
            // Muestra alerta si se llega al último ejercicio
            alert('¡Has completado todos los ejercicios!');
        }
    });
    
    // Obtiene el botón de verificación/explicación
    const verifyButton = document.getElementById('submit-answer');
    
    // Si existe, configura su evento para mostrar/ocultar la explicación
    if (verifyButton) 
    {
        // Configura el evento para el botón de verificación/explicación
        verifyButton.addEventListener('click', () => 
        {
            // Busca el ejercicio actual
            const exercise = exerciseState.exercises.find(ex => ex.id === exerciseState.currentExerciseId);
            
            // Si no se encuentra el ejercicio, sale de la función
            if (!exercise) return;
            
            // Obtiene el contenedor de la explicación
            const explanationContainer = document.getElementById('explanation-container');
            
            // Si existe el contenedor de la explicación
            if (explanationContainer) 
            {
                // Alterna la visibilidad de la explicación
                const isVisible = explanationContainer.style.display === 'block';
                
                // Si la explicación no está visible
                if (!isVisible) 
                {
                    // Muestra la explicación y hace scroll hacia ella
                    explanationContainer.style.display = 'block';
                    
                    // Espera un momento para que la explicación se muestre
                    setTimeout(() => 
                    {
                        // Hace scroll hacia la explicación
                        explanationContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                } 
                else 
                {
                    // Oculta la explicación si ya está visible
                    explanationContainer.style.display = 'none';
                }
            }
        });
    }
    
    // Obtiene el contenedor de opciones de respuesta
    const optionsContainer = document.querySelector('.exercise-options');
    
    // Si existe, configura el evento de click para seleccionar opción y marcarla
    if (optionsContainer) 
    {
        // Configura el evento de click para seleccionar opción y marcarla
        optionsContainer.addEventListener('click', (e) => 
        {
            // Busca el botón de opción más cercano al click
            const optionButton = e.target.closest('.option-button');
            
            // Si no se encuentra el botón de opción, sale de la función
            if (!optionButton) return;
            
            // Si la opción está deshabilitada, no permite interacción
            if (optionButton.getAttribute('data-disabled') === 'true') return;
            
            // Obtiene el índice de la opción seleccionada
            const selectedIndex = parseInt(optionButton.dataset.option);
            
            // Desmarca todas las opciones previamente seleccionadas
            document.querySelectorAll('.option-button').forEach(btn => 
            {
                // Quita la clase 'selected' de todas las opciones
                btn.classList.remove('selected');
            });

            // Marca la opción seleccionada
            optionButton.classList.add('selected');
            
            // Habilitar el botón de verificar respuesta
            const verifyButton = document.getElementById('submit-answer');
            
            // Si existe el botón de verificar respuesta
            if (verifyButton) 
            {
                // Deshabilita el botón de verificar respuesta
                verifyButton.disabled = false;
            }
            
            // Verificar la respuesta
            checkAnswer(selectedIndex);
        });
    }
}

// Función para renderizar la barra lateral con la lista de ejercicios
function renderSidebar() 
{
    // Intenta ejecutar el flujo principal de renderizado de la barra lateral
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
        
        // Calcular la cantidad de ejercicios completados
        const completedExercises = exerciseState.exercises.filter(ex => exerciseState.userAnswers[ex.id] !== undefined).length;
        
        // Calcular el total de ejercicios
        const totalExercises = exerciseState.exercises.length;
        
        // Calcular el porcentaje de progreso
        const progressPercentage = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;
        
        // Obtener el elemento de la barra de progreso
        const progressBarFill = document.querySelector('.app-header .progress-bar-fill');
        
        // Obtener el elemento de texto de progreso
        const progressText = document.querySelector('.app-header .progress-text');
        
        // Actualizar el ancho de la barra de progreso
        if (progressBarFill) 
        {
            // Actualiza el ancho de la barra de progreso
            progressBarFill.style.width = `${progressPercentage}%`;
        }
        
        // Actualizar el texto de progreso
        if (progressText) 
        {
            // Actualizar el texto de progreso
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
            
            // Verificar si el ejercicio tiene respuesta
            const userAnswer = exerciseState.userAnswers[exercise.id];
            
            // Verificar si el ejercicio ha sido respondido
            const isCompleted = userAnswer !== undefined;
            
            // Asegurar que ambos valores sean strings para comparar correctamente
            const correctAnswerStr = exercise.correct_answer !== undefined ? exercise.correct_answer.toString() : '-1';
            
            // Verificar si el ejercicio ha sido respondido correctamente
            const isCorrect = isCompleted ? (userAnswer === correctAnswerStr) : false;
            
            // Si el ejercicio es el actual
            if (exerciseState.currentExerciseId && exercise.id === exerciseState.currentExerciseId) 
            {
                // Marca el ejercicio como activo
                exerciseItem.classList.add('active');
            }
            
            // Marcar como completado correcta o incorrectamente
            if (isCompleted) 
            {
                // Añadir clase 'answered' para colorear en azul (consistente con modo práctica)
                exerciseItem.classList.add('answered');
                
                // También añadimos la clase de completed/incorrect para mantener la consistencia
                exerciseItem.classList.add(isCorrect ? 'completed' : 'incorrect');
                
                // Cambia el color de fondo del ítem
                exerciseItem.style.backgroundColor = 'rgba(33, 150, 243, 0.15)';
                
                // Añade un borde izquierdo azul
                exerciseItem.style.borderLeft = '3px solid #2196f3';
                
                // Añade una sombra al ítem
                exerciseItem.style.boxShadow = '0 2px 5px rgba(33, 150, 243, 0.2)';
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
                
                // Carga el ejercicio seleccionado
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
        // Registrar cualquier error que ocurra durante el renderizado
        console.error('Error al renderizar la barra lateral de ejercicios:', error);
        
        // Indicar que la operación falló
        return false;
    }
}

// Función para mostrar la pantalla de ejercicios
async function showExercises(topicId, topicName) 
{
    // Asigna el tema seleccionado al estado
    exerciseState.selectedTopic = { id: topicId, name: topicName };
    
    // Obtiene el tema seleccionado del localStorage
    const storedTopic = JSON.parse(localStorage.getItem('selectedTopic'));
    
    // Obtiene el título del tema
    const mainTopicTitle = storedTopic ? storedTopic.title : topicName;
    
    // Obtiene el elemento del título del tema
    const topicTitle = document.getElementById('exercise-topic-title');
    
    // Asigna el título del tema al elemento
    topicTitle.textContent = mainTopicTitle;
    
    // Cargar ejercicios del tema
    await loadTopicExercises(topicId);
    
    // Mostrar la pantalla de ejercicios
    showScreen('exercise-screen');
}

// Función para inicializar los anuncios de Google AdSense
function initializeAds() 
{
    // Obtiene el contenedor de anuncios
    const adContainer = document.getElementById('ad-container');
    
    // Si no se encuentra el contenedor, sale de la función
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
    // Obtiene la referencia al contenedor donde se mostrará el anuncio
    const adContainer = document.getElementById('ad-container');
    
    // Validación defensiva: si no existe el contenedor, termina la función
    if (!adContainer) return;
    
    // Limpiar contenedor anterior para asegurar la carga de un nuevo anuncio - Previene problemas de renderizado
    adContainer.innerHTML = '';
    
    // Crear el elemento ins para el nuevo anuncio de AdSense - Elemento estándar requerido por Google AdSense
    const adElement = document.createElement('ins');
    
    // Establece la clase CSS requerida por AdSense para identificar el elemento como un anuncio
    adElement.className = 'adsbygoogle';
    
    // Configura el modo de visualización como bloque para ocupar todo el ancho disponible
    adElement.style.display = 'block';
    
    // Establece el ancho al 100% para que el anuncio se adapte al contenedor
    adElement.style.width = '100%';
    
    // Define la altura fija del anuncio según el formato seleccionado
    adElement.style.height = '90px'; // Altura estándar para banner horizontal
    
    // Establece el ID de cliente de AdSense para asociar los ingresos con la cuenta correcta
    adElement.setAttribute('data-ad-client', 'ca-pub-XXXXXXXXXXXXXXXX'); // Reemplazar con el ID de cliente real
    
    // Establece el ID del slot específico creado en la consola de AdSense para este formato
    adElement.setAttribute('data-ad-slot', '1234567890'); // Reemplazar con el ID de slot real
    
    // Añadir el elemento de anuncio al contenedor - Inserta en el DOM
    adContainer.appendChild(adElement);
    
    // Solicitar un nuevo anuncio a AdSense
    (window.adsbygoogle = window.adsbygoogle || []).push({});    
}

// Función para limpiar recursos cuando el usuario sale de la página
function cleanupAds() 
{
    // Verifica si existe un temporizador activo para la rotación de anuncios
    if (exerciseState.adRotationTimer)
    {
        // Detiene el temporizador de rotación de anuncios para liberar recursos
        clearInterval(exerciseState.adRotationTimer);
        
        // Elimina la referencia al temporizador para permitir la recolección de basura
        exerciseState.adRotationTimer = null;
    }
}

// Función para inicializar la aplicación
document.addEventListener('DOMContentLoaded', async () => 
{
    // Verificar autenticación
    const user = localStorage.getItem('user');
    
    // Verificar tema seleccionado
    const selectedTopicStr = localStorage.getItem('selectedTopic');
    
    // Procesar tema seleccionado
    let selectedTopic;
    
    // Procesar tema seleccionado
    selectedTopic = JSON.parse(selectedTopicStr);
    
    // Inicializar los anuncios de Google AdSense
    initializeAds();
    
    // Iniciar la aplicación con el tema seleccionado
    await showExercises(selectedTopic.id, selectedTopic.name || 'Ejercicios');
});

// Limpiar recursos cuando el usuario abandona la página
window.addEventListener('beforeunload', cleanupAds);

// Exportar funciones públicas
export { showExercises };
