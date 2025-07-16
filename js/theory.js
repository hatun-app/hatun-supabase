// Módulo para gestionar el contenido teórico de los temas

// Importamos las librerías necesarias
import { getTheoryContent } from './supabase.js';

// Configuración global del módulo de teoría
const THEORY_SETTINGS = 
{
    // Tiempo en minutos para la rotación de anuncios
    adRotationMinutes: 1
};

// Estado global del módulo de teoría
const theoryState = 
{
    // ID de la sección teórica actual que se está visualizando
    currentTheoryId: 1,
    
    // Número total de secciones teóricas disponibles
    totalTheorySections: 0,
    
    // Objeto que contiene todas las secciones teóricas indexadas por ID
    theoryContents: {},
    
    // Información sobre el tema actualmente seleccionado
    selectedTopic: null,
    
    // Referencia al temporizador de rotación de anuncios
    adRotationTimer: null,
    
    // Índice actual del anuncio mostrado
    currentAdIndex: 0
};

// Limpiamos los recursos cuando el usuario abandone la página
window.addEventListener('beforeunload', cleanupAds);

// Evento que se ejecuta cuando el DOM está completamente cargado para inicializar la página de teoría
document.addEventListener('DOMContentLoaded', async function() 
{
    // Inicializamos la página de teoría
    await initTheoryPage();
});

// Función para inicializar la página de teoría
async function initTheoryPage() 
{   
    // Bloque try-catch para manejar posibles errores al inicializar la página de teoría
    try 
    { 
        // Intentamos obtener el tema seleccionado almacenado en localStorage
        const topicStr = localStorage.getItem('selectedTopic');
        
        // Convertimos el string JSON a un objeto JavaScript
        const selectedTopic = JSON.parse(topicStr);

        // Almacenamos el tema seleccionado en el estado global
        theoryState.selectedTopic = {id: selectedTopic.id, title: selectedTopic.title};
        
        // Actualizamos el título del tema en la página
        const theoryTopicTitle = document.getElementById('theory-topic-title');
        
        // Asignamos el título del tema al elemento
        theoryTopicTitle.textContent = theoryState.selectedTopic.title;

        // Obtenemos el tema almacenado en localStorage
        const storedTopic = JSON.parse(localStorage.getItem('selectedTopic'));
        
        // Asignamos el título del tema al estado global
        const topicTitle = storedTopic ? storedTopic.title : theoryState.selectedTopic.title;
        
        // Buscamos el elemento del encabezado del tema
        let topicHeader = document.querySelector('.topic-header');
            
        // Asignamos el título del tema al encabezado
        topicHeader.textContent = topicTitle;

        // Inicializamos los anuncios de Google AdSense
        initializeAds();
        
        // Cargamos el contenido teórico del tema seleccionado
        await loadTopicTheoryContent(Number(theoryState.selectedTopic.id));
    }
    catch (error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Ocurrió un error al intentar iniciar la página deteoría. Por favor intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función para cargar todo el contenido teórico relacionado con un tema específico
async function loadTopicTheoryContent(topicId) 
{
    // Bloque try-catch para manejar posibles errores al cargar el contenido teórico
    try 
    {
        // Obtenemos todos los datos de contenido teórico para el tema seleccionado desde Supabase
        const data = await getTheoryContent(topicId);
        
        // Reiniciamos el objeto de contenidos teóricos para evitar mezclar datos antiguos
        theoryState.theoryContents = {};
        
        // Procesamos cada sección teórica y la almacenamos en el estado global
        data.forEach((section, index) => 
        {
            // Almacenamos cada sección con un índice incremental (comenzando en 1)
            theoryState.theoryContents[index + 1] = 
            {
                // Almacenamos el ID de la sección
                id: section.id,
                
                // Almacenamos el título de la sección o cadena vacía si no existe
                title: section.title || '',
                
                // Almacenamos el contenido HTML de la sección o cadena vacía si no existe
                content: section.content || ''
            };
        });
        
        // Calculamos y almacenamos el número total de secciones teóricas disponibles
        theoryState.totalTheorySections = Object.keys(theoryState.theoryContents).length;
        
        // Actualizamos la barra lateral con las secciones disponibles
        renderSidebar();
        
        // Cargamos la primera sección teórica
        showTheorySection(1);
        
        // Indicamos que la carga fue exitosa
        return true;
    }
    catch (error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Ocurrió un error al intentar cargar el contenido teórico. Por favor intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}
    
// Función para cargar y mostrar una sección específica del contenido teórico
function showTheorySection(theoryId) 
{
    // Bloque try-catch para manejar posibles errores al mostrar una sección específica del contenido teórico
    try 
    {
        // Actualizamos el ID de teoría actual en el estado global
        theoryState.currentTheoryId = parseInt(theoryId);
        
        // Obtenemos el objeto con los datos de la sección teórica
        const theory = theoryState.theoryContents[theoryId];
        
        // Obtenemos el elemento DOM donde se mostrará el contenido
        const contentElement = document.getElementById('theory-content');

        // Asignamos el HTML al contenedor
        contentElement.innerHTML = theory.content;
        
        // Actualizamos la barra lateral para reflejar la sección activa
        renderSidebar();
            
        // Actualizamos los controles de navegación (botones anterior/siguiente)
        updateNavigationControls();
        
        // Indicamos que la carga del contenido fue exitosa
        return true;
    }
    catch (error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Ocurrió un error al intentar cargar la teoría. Por favor intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función para renderizar la barra lateral con las secciones teóricas disponibles
function renderSidebar() 
{
    // Bloque try-catch para manejar errores al renderizar la barra lateral
    try 
    {
        // Obtenemos el contenedor de la barra lateral
        const sidebarContainer = document.getElementById('theory-list');
        
        // Limpiamos todo el contenido anterior de la barra lateral
        while (sidebarContainer.firstChild) 
        {
            // Eliminamos el primer hijo del contenedor
            sidebarContainer.removeChild(sidebarContainer.firstChild);
        }
        
        // Iteramos sobre todas las secciones teóricas disponibles
        for (const key in theoryState.theoryContents) 
        {
            // Verificamos que la propiedad pertenece al objeto y no al prototipo
            if (Object.prototype.hasOwnProperty.call(theoryState.theoryContents, key)) 
            {
                // Obtenemos los datos de la sección actual
                const section = theoryState.theoryContents[key];
                
                // Verificamos que la sección existe y es un objeto válido
                if (!section || typeof section !== 'object') continue;
                
                // Creamos el elemento contenedor para el ítem de la barra lateral
                const exerciseItem = document.createElement('div');
                
                // Asignamos clase CSS para estilizar el ítem
                exerciseItem.className = 'topic-item';
                
                // Guardamos el ID de la sección como atributo de datos
                exerciseItem.dataset.sectionId = key;
                
                // Guardamos el ID de la teoría como atributo de datos
                exerciseItem.dataset.theoryId = key;
                
                // Marcamos como activo el ítem correspondiente a la sección actual
                if (theoryState.currentTheoryId && parseInt(key) === theoryState.currentTheoryId) 
                {
                    // Añadimos clase 'active' para destacar la sección actual
                    exerciseItem.classList.add('active');
                }
                
                // Creamos el elemento de icono para el ítem
                const iconElement = document.createElement('div');
                
                // Asignamos clase CSS para el icono
                iconElement.className = 'topic-icon';
                
                // Añadimos el icono de libro usando FontAwesome
                iconElement.innerHTML = `<i class="fas fa-book"></i>`;
                
                // Creamos el elemento para el nombre de la sección
                const nameElement = document.createElement('div');
                
                // Asignamos clase CSS para el nombre
                nameElement.className = 'topic-name';
                
                // Establecemos el texto del nombre (título o texto predeterminado)
                nameElement.textContent = section.title || `Sección ${key}`;
                
                // Añadimos el icono al ítem
                exerciseItem.appendChild(iconElement);
                
                // Añadimos el nombre al ítem
                exerciseItem.appendChild(nameElement);
                
                // Establecemos el rol de botón para accesibilidad
                exerciseItem.setAttribute('role', 'button');
                
                // Agregamos manejador de eventos para cuando se hace clic en la sección
                exerciseItem.addEventListener('click', function() 
                {
                    // Obtenemos el ID de teoría del atributo de datos
                    const theoryId = this.dataset.theoryId;
                    
                    // Obtenemos todos los ítems de la barra lateral
                    const allItems = sidebarContainer.querySelectorAll('.topic-item');
                    
                    // Removemos la clase 'active' de todos los ítems
                    allItems.forEach(item => item.classList.remove('active'));
                    
                    // Añadimos la clase 'active' al ítem actual
                    this.classList.add('active');
                    
                    // Cargamos el contenido de la sección seleccionada
                    showTheorySection(parseInt(theoryId, 10));
                });
                
                // Añadimos el ítem completo al contenedor de la barra lateral
                sidebarContainer.appendChild(exerciseItem);
            }
        }
        
        // Si hay una sección actualmente seleccionada, aseguramos que esté visible
        if (theoryState.currentTheoryId) 
        {
            // Obtenemos todos los ítems de la barra lateral
            const allItems = sidebarContainer.querySelectorAll('.topic-item');
            
            // Recorremos todos los ítems para encontrar el activo
            allItems.forEach(item => 
            {
                // Verificamos si este ítem corresponde a la sección actual
                if (parseInt(item.dataset.theoryId) === theoryState.currentTheoryId) 
                {
                    // Marcamos este ítem como activo
                    item.classList.add('active');
                    
                    // Hacemos scroll hasta este ítem para asegurar que está visible
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } 
                else 
                {
                    // Aseguramos que los demás ítems no estén marcados como activos
                    item.classList.remove('active');
                }
            });
        }
        
        // Indicamos que la operación fue exitosa
        return true;
    } 
    catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al intentar cargar la teoría. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función para actualizar los controles de navegación y barra de progreso
function updateNavigationControls() 
{
    // Bloque try-catch para manejar errores al actualizar los controles de navegación
    try 
    {
        // Obtenemos el ID de la sección actual
        const currentId = theoryState.currentTheoryId;
        
        // Obtenemos el número total de secciones
        const totalSections = theoryState.totalTheorySections;
        
        // Calculamos el porcentaje de progreso (considerando 0% al inicio y 100% al final)
        const progressPercent = ((currentId - 1) / Math.max(1, totalSections - 1)) * 100;
        
        // Obtenemos el elemento de la barra de progreso
        const progressBar = document.querySelector('.progress-bar-fill');
        
        // Actualizamos el ancho de la barra de progreso según el porcentaje calculado
        progressBar.style.width = `${progressPercent}%`;
        
        // Obtenemos el elemento de texto que muestra el porcentaje
        const progressText = document.querySelector('.progress-text');
        
        // Actualizamos el texto de progreso con el valor redondeado
        progressText.textContent = `${Math.round(progressPercent)}% Completado`;
        
        // Obtenemos el botón de navegación hacia atrás
        const prevButton = document.getElementById('prev-button');
        
        // Actualizamos el comportamiento del botón anterior
        if (prevButton) 
        {
            // Clonamos el botón existente para eliminar listeners previos
            const oldPrevButton = prevButton.cloneNode(true);
            
            // Reemplazamos el botón original con el clon para eliminar eventos
            if (prevButton.parentNode) 
            {
                // Sustituimos el nodo viejo con el nuevo en el DOM
                prevButton.parentNode.replaceChild(oldPrevButton, prevButton);
            }
            
            // Obtenemos referencia al nuevo botón en el DOM
            const newPrevButton = document.getElementById('prev-button');
            
            // Configuramos el nuevo botón anterior
            if (newPrevButton) 
            {
                // Deshabilitamos el botón si estamos en la primera sección
                newPrevButton.disabled = currentId <= 1;
                
                // Añadimos manejador de eventos para la navegación hacia atrás
                newPrevButton.addEventListener('click', function(e) 
                {
                    // Prevenimos comportamiento predeterminado del enlace
                    e.preventDefault();
                    
                    // Verificamos que no estamos en la primera sección
                    if (theoryState.currentTheoryId > 1) 
                    {
                        // Cargamos la sección anterior
                        showTheorySection(theoryState.currentTheoryId - 1);
                    }
                });
            }
        }
        
        // Obtenemos el botón de navegación hacia adelante
        const nextButton = document.getElementById('next-button');
        
        // Actualizamos el comportamiento del botón siguiente
        if (nextButton) 
        {
            // Clonamos el botón existente para eliminar listeners previos
            const oldNextButton = nextButton.cloneNode(true);
            
            // Reemplazamos el botón original con el clon para eliminar eventos
            if (nextButton.parentNode) 
            {
                // Sustituimos el nodo viejo con el nuevo en el DOM
                nextButton.parentNode.replaceChild(oldNextButton, nextButton);
            }
            
            // Obtenemos referencia al nuevo botón en el DOM
            const newNextButton = document.getElementById('next-button');
            
            // Configuramos el nuevo botón siguiente
            if (newNextButton) 
            {
                // Deshabilitamos el botón si estamos en la última sección
                newNextButton.disabled = currentId >= totalSections;
                
                // Añadimos manejador de eventos para la navegación hacia adelante
                newNextButton.addEventListener('click', function(e) 
                {
                    // Prevenimos comportamiento predeterminado del enlace
                    e.preventDefault();
                    
                    // Verificamos que no estamos en la última sección
                    if (theoryState.currentTheoryId < theoryState.totalTheorySections) 
                    {
                        // Cargamos la siguiente sección
                        showTheorySection(theoryState.currentTheoryId + 1);
                    }
                });
            }
        }
        
        // Indicamos que la actualización de controles fue exitosa
        return true;
    } 
    catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al intentar cargar la teoría. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función para inicializar los anuncios de Google AdSense
function initializeAds() 
{
    // Bloque try-catch para manejar posibles errores al inicializar los anuncios
    try
    {
        // Obtenemos el contenedor de anuncios
        const adContainer = document.getElementById('ad-container');
        
        // Si el contenedor no existe, salimos
        if (!adContainer) return;
        
        // Iniciamos la rotación de anuncios
        loadAd();
        
        // Configuramos temporizador para rotar anuncios cada minuto
        theoryState.adRotationTimer = setInterval(() => 
        {
            // Cargar un nuevo anuncio
            loadAd();
        }, THEORY_SETTINGS.adRotationMinutes * 60 * 1000);
    }
    catch (error)
    {
        // Generamos el mensaje de error
        console.log('Error al inicializar los anuncios: ' + error);
    }
}

// Función para cargar un nuevo anuncio de AdSense
function loadAd() 
{
    // Bloque try-catch para manejar posibles errores al cargar un anuncio
    try
    {
        // Obtener el contenedor de anuncios
        const adContainer = document.getElementById('ad-container');
        
        // Si el contenedor no existe, salir
        if (!adContainer) return;
        
        // Limpiar contenedor anterior para asegurar la carga de un nuevo anuncio
        adContainer.innerHTML = '';
        
        // Crear el elemento ins para el nuevo anuncio de AdSense
        const adElement = document.createElement('ins');
        
        // Asignamos la| clase al elemento
        adElement.className = 'adsbygoogle';
        adElement.style.display = 'block';
        adElement.style.width = '100%';
        adElement.style.height = '90px'; 
        adElement.setAttribute('data-ad-client', 'ca-pub-XXXXXXXXXXXXXXXX'); // Reemplazar con el ID de cliente real
        adElement.setAttribute('data-ad-slot', '1234567890'); // Reemplazar con el ID de slot real
        
        // Añadir al contenedor
        adContainer.appendChild(adElement);
        
        // Solicitar un nuevo anuncio a AdSense
        try 
        {
            // Solicitar un nuevo anuncio a AdSense
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (error) 
        {
            // Generamos el mensaje de error
            console.log('Error al cargar el anuncio: ' + error);
        }
    }
    catch (error)
    {
        // Generamos el mensaje de error
        console.log('Error al cargar el anuncio: ' + error);
    }
}

// Función para limpiar recursos cuando el usuario sale de la página
function cleanupAds() 
{
    // Bloque try-catch para manejar posibles errores al limpiar los anuncios
    try
    {
        // Limpiar el temporizador si existe
        if (theoryState.adRotationTimer) 
        {
            // Limpiar el temporizador
            clearInterval(theoryState.adRotationTimer);
            
            // Limpiar el temporizador
            theoryState.adRotationTimer = null;
        }
    }
    catch (error)
    {
        // Generamos el mensaje de error
        console.log('Error al limpiar los anuncios: ' + error);
    }
}
