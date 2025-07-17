// Módulo para manejar la página de selección de modos de estudio

// Importamos las dependencias necesarias
import { signOut } from './supabase.js';

// Estado global de los modos
const modesState = 
{
    // Tema seleccionado
    selectedTopic: null,
    
    // Modo seleccionado
    selectedMode: null,
    
    // Contador de errores
    errorCount: 0,
    
    // Último error
    lastError: null
};

// Inicializamos la página de modos de estudio cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', async function() 
{
    // Verificamos si estamos en la página de modos de estudio antes de inicializar
    const isModesPage = window.location.pathname.includes('modes.html') || window.location.pathname.endsWith('/');
        
    // Si estamos en la página de modos de estudio, inicializamos el módulo
    if (isModesPage) 
    {
        // Inicializamos la página de modos de estudio
        await initModesPage();
    }
});

// Función que inicializa la página de modos de estudio
async function initModesPage() 
{   
    // Bloque try-catch para manejo de errores en la inicialización de la página de modos de estudio
    try
    {
        // Limpiamos cualquier error previo
        modesState.error = null;

        // Configuramos el botón de cierre de sesión
        const logoutButton = document.getElementById('logout-button');
        
        // Añadimos el evento click al botón de cierre de sesión
        if (logoutButton) 
        {
            // Al hacer click en el botón de cierre de sesión, ejecutamos la función signOut
            logoutButton.addEventListener('click', async () => 
            {
                // Llamamos a la función de cierre de sesión
                await signOut();
            });
        }
        
        // Obtenemos el overlay de carga
        const loadingOverlay = document.getElementById('loading-overlay');

        // Mostramos el overlay
        loadingOverlay.style.display = 'flex';
    
        // Obtenemos el modal de selección de duración para el modo práctica
        const practiceDurationModal = document.getElementById('practice-duration-modal');

        // Ocultamos el overlay
        loadingOverlay.style.display = 'none';
    
        // Obtenemos el botón de modo teoría
        const theoryModeBtn = document.getElementById('theory-mode');

        // Agregamos el evento de click al botón de teoría
        theoryModeBtn.addEventListener('click', function(event) 
        {
            // Evitamos que el evento se propague
            event.preventDefault();
            
            // Iniciamos el modo teoría
            selectMode('theory');
        });
    
        // Obtenemos el botón de modo aprendizaje
        const learningModeBtn = document.getElementById('learning-mode');

        // Agregamos el evento de click al botón de aprendizaje
        learningModeBtn.addEventListener('click', function(event) 
        {
            // Evitamos que el evento se propague
            event.preventDefault();
            
            // Iniciamos el modo aprendizaje
            selectMode('learning');
        });
    
        // Obtenemos el botón de modo práctica
        const practiceModeBtn = document.getElementById('practice-mode');
    
        // Agregamos el evento de click al botón de práctica
        practiceModeBtn.addEventListener('click', function(event) 
        {
            // Evitamos que el evento se propague
            event.preventDefault();
        
            // Mostramos el modal
            practiceDurationModal.style.display = 'flex';
        
            // Obtenemos el input de duración
            const durationInput = document.getElementById('practice-duration');
        
            // Enfocamos el input
            durationInput.focus();
        });
    
        // Obtenemos el botón para cancelar la selección de duración
        const cancelDurationBtn = document.getElementById('cancel-practice');
    
        // Agregamos el evento de click al botón de cancelar
        cancelDurationBtn.addEventListener('click', function(event) 
        {
            // Evitamos que el evento se propague
            event.preventDefault();
        
            // Ocultamos el modal
            practiceDurationModal.style.display = 'none';
        });
        
        // Obtenemos el botón para confirmar la selección de duración
        const confirmDurationBtn = document.getElementById('start-practice');

        // Agregamos el evento de click al botón de confirmar
        confirmDurationBtn.addEventListener('click', function(event) 
        {
            // Evitamos que el evento se propague
            event.preventDefault();
            
            // Obtenemos el input de duración
            const durationInput = document.getElementById('practice-duration');
            
            // Convertimos el valor a entero
            const durationValue = parseInt(durationInput.value, 10);

            // Ocultamos el modal
            practiceDurationModal.style.display = 'none';
            
            // Iniciamos el modo práctica
            selectMode('practice', durationValue);
        });
    }
    catch (error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al iniciar la página de modos de estudio. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }    
}

// Función para gestionar la selección de un modo de estudio y redirigir a la página correspondiente
function selectMode(mode, duration) 
{
    // Actualizamos el estado local con el modo seleccionado
    modesState.selectedMode = mode;
    
    // Almacenamos el modo seleccionado en localStorage para persistencia
    localStorage.setItem('selectedMode', mode);
    
    // Manejamos configuraciones específicas para el modo de práctica
    if (mode === 'practice') 
    {
        // Convertimos la duración a un número entero (en minutos)
        const numericDuration = parseInt(duration, 10);
        
        // Guardamos la duración válida en localStorage
        localStorage.setItem('practiceDuration', numericDuration);
    } 
    else 
    {
        // Para otros modos, establecemos la duración de práctica a 0 (no aplicable)
        localStorage.setItem('practiceDuration', 0);
    }

    // Inicializamos la variable que contendrá la página destino
    let targetPage = '';

    // Determinamos la página destino según el modo seleccionado
    if (mode === 'theory') 
    {
        // Si el modo es teoría, redirigimos a la página de teoría
        targetPage = 'theory.html';
    } 
    else if (mode === 'learning') 
    {
        // Si el modo es aprendizaje, redirigimos a la página de aprendizaje
        targetPage = 'learning.html';
    } 
    else if (mode === 'practice') 
    {
        // Si el modo es práctica, redirigimos a la página de práctica
        targetPage = 'practice.html';
    } 
    else 
    {
        // Si el modo no es válido, redirigimos a la página de inicio
        targetPage = 'index.html';
    }
    
    // Redirigimos al usuario a la página correspondiente
    window.location.href = targetPage;
}

// Exportamos las funciones y variables
export 
{ 
    initModesPage,
    selectMode, 
};
