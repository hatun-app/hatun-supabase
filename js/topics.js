// Módulo para la página de temas

// Importamos las dependencias necesarias
import { getTopics } from './supabase.js';

// Estado local para la gestión de temas
const topicsState = 
{
    // Lista completa de temas obtenidos de la base de datos
    topics: [],
    
    // Lista de temas filtrados para mostrar en la interfaz
    filteredTopics: [],
    
    // Estado de carga
    loading: false,

    // Estado de error
    error: null,
    
    // Fecha de última actualización para caché
    lastUpdated: null,
    
    // Información del curso actual
    currentCourse: null
};

// Inicializamos la página cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', async function ()
{
    // Verificamos si estamos en la página de temas
    const isTopicsPage = window.location.pathname.includes('topics.html') || document.getElementById('topics-page') !== null;
    
    // Si estamos en la página de temas
    if (isTopicsPage) 
    {
        // Inicializamos la página de temas
        await initTopicsPage();
    }
});

// Función que inicializa la página de temas
async function initTopicsPage() 
{       
    // Bloque try-catch para manejar posibles errores al inicializar la página de temas
    try
    {
        // Configuramos el botón de perfil
        const profileButton = document.getElementById('profile-button');
        
        // Añadimos el evento click al botón de perfil
        if (profileButton) 
        {
            // Al hacer click en el botón de perfil, navegamos a la página de perfil
            profileButton.addEventListener('click', () => 
            {
                // Redireccionamos a la página de perfil
                window.location.href = 'profile.html';
            });
        }
        
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

        // Obtenemos referencia al elemento del overlay de carga
        const loadingOverlay = document.getElementById('loading-overlay');

        // Mostramos el overlay de carga cambiando su estilo a flex
        loadingOverlay.style.display = 'flex';
            
        // Recuperamos la información del curso seleccionado del almacenamiento local
        const selectedCourse = JSON.parse(localStorage.getItem('selectedCourse'));

        // Actualizamos el estado del curso actual
        topicsState.currentCourse = 
        {
            // Guardamos el ID del curso seleccionado
            id: selectedCourse.id,
            
            // Guardamos el título del curso seleccionado
            title: selectedCourse.title
        };
        
        // Obtenemos la referencia al elemento que muestra el título del curso
        const pageTitle = document.getElementById('topics-course-title');

        // Actualizamos el texto del título con el nombre del curso actual
        pageTitle.textContent = topicsState.currentCourse.title;
        
        // Inicializamos la funcionalidad de búsqueda de temas
        setupTopicSearch();
            
        // Hacemos una petición a la base de datos para obtener los temas del curso
        const topics = await getTopics(selectedCourse.id);
                
        // Asignamos los temas al estado
        topicsState.topics = topics;
                
        // Inicializamos los temas filtrados con todos los temas disponibles
        topicsState.filteredTopics = [...topicsState.topics];
                
        // Llamamos a la función que muestra los temas en la interfaz
        renderTopicList(topicsState.topics); 

        // Ocultamos el overlay de carga ya que los temas han sido renderizados
        loadingOverlay.style.display = 'none';
    }
    catch (error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al iniciar la página de temas. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función que renderiza la lista de temas en la interfaz
function renderTopicList(topics) 
{
    // Bloque try-catch para manejar posibles errores al renderizar la lista de temas
    try
    {
        // Obtenemos el elemento que muestra el contador de temas en el encabezado
        const topicCountElement = document.getElementById('topic-count');
            
        // Actualizamos el contador de temas con la cantidad actual
        topicCountElement.textContent = topics ? topics.length : 0;

        // Obtenemos el contenedor donde se mostrarán los temas
        const topicList = document.getElementById('topic-list');

        // Limpiamos cualquier contenido previo en la lista de temas para evitar duplicados
        while (topicList.firstChild) 
        {
            // Eliminamos todos los hijos del contenedor uno por uno
            topicList.removeChild(topicList.firstChild);
        }

        // Creamos un fragmento de documento para mejorar el rendimiento al añadir múltiples elementos
        const fragment = document.createDocumentFragment();

        // Iteramos sobre cada tema en el arreglo y creamos una tarjeta para cada uno
        topics.forEach(topic => 
        {
            // Creamos el elemento principal para la tarjeta del tema
            const topicCard = document.createElement('div');
            
            // Asignamos la clase CSS para estilizar la tarjeta
            topicCard.className = 'topic-card';
            
            // Guardamos el ID del tema
            topicCard.dataset.topicId = topic.id;
            
            // Creamos un div para la imagen del tema 
            const imageDiv = document.createElement('div');
            
            // Asignamos la clase CSS para estilizar el contenedor de la imagen
            imageDiv.className = 'topic-image';
            
            // Creamos el elemento img para mostrar la imagen del tema
            const image = document.createElement('img');
            
            // Establecemos la URL de la imagen sanitizada
            image.src = topic.image_url;
            
            // Configuramos el ajuste de la imagen para cubrir el espacio disponible
            image.style.objectFit = 'cover';
            
            // Añadimos la imagen al contenedor de imagen
            imageDiv.appendChild(image);
            
            // Añadimos el contenedor de imagen a la tarjeta del tema
            topicCard.appendChild(imageDiv);
            
            // Creamos un div para contener la información textual del tema
            const infoDiv = document.createElement('div');
            
            // Asignamos la clase CSS para estilizar el contenedor de información
            infoDiv.className = 'topic-info';
            
            // Creamos un elemento h3 para el título del tema
            const title = document.createElement('h3');
            
            // Establecemos el texto del título sanitizado
            title.textContent = topic.title;
            
            // Añadimos el título al contenedor de información
            infoDiv.appendChild(title);
            
            // Creamos un div para los datos del tema
            const metaDiv = document.createElement('div');
            
            // Asignamos la clase CSS para estilizar los datos
            metaDiv.className = 'topic-meta';
            
            // Creamos un span para mostrar la cantidad de ejercicios
            const exerciseSpan = document.createElement('span');
            
            // Creamos un ícono para representar los ejercicios
            const exerciseIcon = document.createElement('i');
            
            // Asignamos la clase para mostrar el ícono de tareas
            exerciseIcon.className = 'fas fa-tasks';
            
            // Añadimos el ícono al span de ejercicios
            exerciseSpan.appendChild(exerciseIcon);
            
            // Validamos la cantidad de ejercicios para asegurar que sea un número válido
            const exerciseCount = topic.exercise_count;
            
            // Añadimos el texto con la cantidad de ejercicios junto al ícono
            exerciseSpan.appendChild(document.createTextNode(` ${exerciseCount} ejercicios`));
            
            // Añadimos el span de ejercicios al div de datos
            metaDiv.appendChild(exerciseSpan);
            
            // Añadimos el div de datos al contenedor de información
            infoDiv.appendChild(metaDiv);
            
            // Añadimos el contenedor de información a la tarjeta del tema
            topicCard.appendChild(infoDiv);
            
            // Añadimos un evento click a la tarjeta para navegar al tema cuando se seleccione
            topicCard.addEventListener('click', () => selectTopic(topic.id, topic.title));
            
            // Añadimos la tarjeta completa al fragmento de documento
            fragment.appendChild(topicCard); 

        });

        // Verificamos si hay temas para mostrar
        if (topics.length > 0) 
        {
            // Si hay temas, añadimos el fragmento con todas las tarjetas al DOM
            topicList.appendChild(fragment);
        } 
        else 
        {
            // Creamos un elemento para mostrar un mensaje cuando no hay resultados
            const noResultsDiv = document.createElement('div');
            
            // Asignamos la clase CSS para estilizar el mensaje de sin resultados
            noResultsDiv.className = 'no-results';
            
            // Establecemos el texto del mensaje para informar al usuario
            noResultsDiv.textContent = 'No se encontraron temas que coincidan con tu búsqueda.';

            // Añadimos el mensaje al contenedor de la lista de temas
            topicList.appendChild(noResultsDiv);
        }        
    }
    catch (error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al iniciar la página de temas. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función que configura la funcionalidad de búsqueda de temas
function setupTopicSearch() 
{
    // Bloque try-catch para manejar posibles errores al configurar la funcionalidad de búsqueda de temas
    try
    {
        // Obtenemos la referencia al campo de entrada de búsqueda desde el DOM
        const searchInput = document.getElementById('topic-search');
        
        // Añadimos un evento 'input' que se dispara cada vez que el usuario escribe en el campo de búsqueda
        searchInput.addEventListener('input', function() 
        {
            // Obtiene el valor actual del input, quitando espacios y pasando a minúsculas
            const searchTerm = this.value.trim().toLowerCase();
                
            // Llama a filterTopics para actualizar la lista según el término
            filterTopics(searchTerm);        
        });
    }
    catch (error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al iniciar la página de temas. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función que filtra los temas según el término de búsqueda
function filterTopics(searchTerm) 
{
    // Bloque try-catch para manejar posibles errores al filtrar los temas
    try
    {
        // Limpiamos el término de búsqueda
        const safeTerm = (searchTerm || '').toLowerCase().trim();
        
        // Verificamos si el término de búsqueda está vacío después de la limpieza
        if (!safeTerm) 
        {
            // Si no hay término de búsqueda, mostramos todos los temas
            topicsState.filteredTopics = [...topicsState.topics];
        }
        else 
        {
            // Si hay un término de búsqueda, filtramos los temas
            const filtered = topicsState.topics.filter(topic => 
            {
                // Obtenemos el título del tema
                const title = ((topic.title || '') + '').toLowerCase();
                
                // Comprobamos si el título incluye el término de búsqueda
                return title.includes(safeTerm);
            });

            // Actualizamos el estado con los temas filtrados
            topicsState.filteredTopics = filtered;
        }
        
        // Renderizamos la lista de temas filtrados en la interfaz
        renderTopicList(topicsState.filteredTopics);
    }
    catch (error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al filtrar los temas. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función para seleccionar un tema y navegar a la página de modos de estudio
function selectTopic(topicId, topicTitle = '') 
{
    // Bloque try-catch para manejar posibles errores al seleccionar un tema
    try
    {
        // Convertimos el ID del tema a número para asegurar consistencia en el tipo de dato
        const validTopicId = Number(topicId);
        
        // Buscamos el tema seleccionado en la lista de temas
        const selectedTopic = topicsState.topics.find(t => t.id === validTopicId);
        
        // Obtenemos el curso seleccionado del localStorage
        const selectedCourse = JSON.parse(localStorage.getItem('selectedCourse') || '{}');
        
        // Creamos un objeto con los datos del tema que queremos almacenar
        const topicData = 
        {
            // Almacenamos el ID del tema
            id: validTopicId,
            
            // Almacenamos el título del tema después de sanitizarlo
            title: topicTitle || selectedTopic.title,
            
            // Almacenamos el ID del curso al que pertenece el tema
            courseId: selectedCourse.id
        };
        
        // Guardamos los datos del tema en el localStorage
        localStorage.setItem('selectedTopic', JSON.stringify(topicData));
        
        // Redirigimos al usuario a la página de modos de estudio del tema seleccionado
        window.location.href = 'modes.html';
    }
    catch (error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al seleccionar el tema. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Exportamos las funciones que necesitan ser accesibles desde otros módulos
export 
{
    initTopicsPage,
    renderTopicList,
    setupTopicSearch,
    filterTopics,
    selectTopic
};
