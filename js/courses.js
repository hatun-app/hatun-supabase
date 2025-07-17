// Módulo para la página de cursos

// Importamos las dependencias necesarias
import { getCourses } from './supabase.js';

// Estado local para los cursos
const coursesState = 
{
    // Lista completa de cursos obtenidos de la base de datos
    courses: [],
    
    // Lista de cursos filtrados para mostrar en la interfaz
    filteredCourses: [],
    
    // Estado de carga
    loading: false,

    // Estado de error
    error: null,
    
    // Fecha de última actualización para caché
    lastUpdated: null
};

// Inicializamos la página cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', async function() 
{
    // Verificamos si estamos en la página de cursos antes de inicializar
    const isCoursesPage = window.location.pathname.includes('courses.html') || window.location.pathname.endsWith('/') || document.getElementById('course-list') !== null;
    
    // Si estamos en la página de cursos, inicializamos el módulo
    if (isCoursesPage) 
    {
        // Inicializamos la página de cursos
        await initCoursesPage();
    }
});

// Función que inicializa la página de cursos
async function initCoursesPage() 
{   
    // Bloque try-catch para manejo de errores en la inicialización de la página de cursos
    try
    {
        // Actualizamos el estado de carga para indicar que se está cargando el contenido
        coursesState.loading = true;
        
        // Limpiamos cualquier error previo
        coursesState.error = null;
        
        // Obtenemos referencia al elemento del overlay de carga
        const loadingOverlay = document.getElementById('loading-overlay');

        // Mostramos el overlay de carga cambiando su estilo a flex
        loadingOverlay.style.display = 'flex';
        
        // Obtenemos la lista de cursos desde Supabase
        const courses = await getCourses();
        
        // Guardamos la lista completa de cursos
        coursesState.courses = courses; 

        // Creamos una copia para el filtrado
        coursesState.filteredCourses = [...courses]; 
        
        // Registramos la fecha/hora de la última actualización
        coursesState.lastUpdated = new Date(); 
        
        // Guardamos los cursos en el almacenamiento local
        localStorage.setItem('courses', JSON.stringify(courses));
        
        // Configuramos la funcionalidad de búsqueda de cursos
        setupCourseSearch();
        
        // Renderizamos la lista de cursos en la interfaz
        renderCourseList(courses);

        // Ocultamos el overlay de carga ya que los cursos han sido renderizados
        loadingOverlay.style.display = 'none';
    }
    catch (error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al iniciar la página de cursos. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }    
}

// Función que renderiza la lista de cursos en la interfaz
function renderCourseList(courses) 
{
    // Bloque try-catch para manejar posibles errores al renderizar la lista de cursos
    try
    {
        // Obtiene el elemento donde se muestra el número total de cursos
        const courseCountElement = document.getElementById('course-count');

        // Actualiza el texto del contador de cursos con la cantidad actual
        courseCountElement.textContent = courses.length;

        // Obtiene el contenedor principal donde se insertarán las tarjetas de cursos
        const courseList = document.getElementById('course-list');

        // Limpiamos el contenedor de tarjetas de cursos eliminando todos sus hijos
        while (courseList.firstChild) 
        {
            // Eliminamos el primer hijo hasta que no quede ninguno
            courseList.removeChild(courseList.firstChild);
        }

        // Creamos un fragmento de documento para mejorar el rendimiento al añadir múltiples elementos
        const fragment = document.createDocumentFragment();
        
        // Recorremos el arreglo de cursos recibido
        courses.forEach(course => 
        {
            // Creamos el div principal de la tarjeta del curso
            const courseCard = document.createElement('div');
            
            // Aplicamos la clase CSS para el estilo visual de la tarjeta
            courseCard.className = 'course-card';
            
            // Guardamos el ID del curso
            courseCard.dataset.courseId = course.id;
            
            // Creamos el div para la imagen del curso
            const imageDiv = document.createElement('div');
        
            // Aplicamos la clase CSS para el contenedor de imagen
            imageDiv.className = 'course-image';
            
            // Creamos el elemento de imagen
            const image = document.createElement('img');
            
            // Asignamos la URL de la imagen del curso
            image.src = course.image_url;
            
            // Aseguramos que la imagen cubra todo el espacio asignado
            image.style.objectFit = 'cover';
            
            // Insertamos la imagen dentro del div de imagen
            imageDiv.appendChild(image);
        
            // Insertamos el div de imagen en la tarjeta del curso
            courseCard.appendChild(imageDiv);
            
            // Creamos el div para la información del curso
            const infoDiv = document.createElement('div');
            
            // Aplicamos la clase CSS para el bloque de información
            infoDiv.className = 'course-info';
            
            // Creamos el encabezado para el título del curso
            const title = document.createElement('h3');
            
            // Asignamos el texto del título
            title.textContent = course.title;
            
            // Insertamos el título en el div de información
            infoDiv.appendChild(title);
        
            // Creamos el div para los datos del curso
            const metaDiv = document.createElement('div');
        
            // Aplicamos la clase CSS para los datos
            metaDiv.className = 'course-meta';
            
            // Creamos un span para mostrar el número de temas
            const topicsSpan = document.createElement('span');
            
            // Creamos el ícono para que acompañe el número de temas
            const topicsIcon = document.createElement('i');
        
            // Asignamos la clase para el ícono de libro
            topicsIcon.className = 'fas fa-book';
            
            // Insertamos el ícono en el span de temas
            topicsSpan.appendChild(topicsIcon);
            
            // Obtenemos el número de temas
            const topicsCount = course.topics_count;
            
            // Insertamos el texto con el número de temas junto al ícono
            topicsSpan.appendChild(document.createTextNode(` ${topicsCount} temas`));
            
            // Insertamos el span de temas en el div de datos
            metaDiv.appendChild(topicsSpan);        
            
            // Insertamos el div de datos en el div de información
            infoDiv.appendChild(metaDiv);
            
            // Insertamos el bloque de información en la tarjeta del curso
            courseCard.appendChild(infoDiv);
            
            // Asociamos un evento click a la tarjeta para seleccionar el curso
            courseCard.addEventListener('click', () => selectCourse(course.id));

            // Añadimos la tarjeta completa al fragmento de documento
            fragment.appendChild(courseCard);
        });
        
        // Verificamos si hay cursos para mostrar
        if (courses.length > 0) 
        {
            // Si hay cursos, añadimos el fragmento con todas las tarjetas al DOM
            courseList.appendChild(fragment);
        }
        else 
        {
            // Creamos el div para el mensaje de no resultados
            const noResultsDiv = document.createElement('div');
            
            // Aplicamos la clase CSS para el mensaje
            noResultsDiv.className = 'no-results';
            
            // Asignamos el texto del mensaje
            noResultsDiv.textContent = 'No se encontraron cursos que coincidan con tu búsqueda.';
            
            // Insertamos el mensaje en el contenedor de la lista de cursos
            courseList.appendChild(noResultsDiv);
        }
    }
    catch (error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al iniciar la página de cursos. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función que configura la funcionalidad del buscador de cursos
function setupCourseSearch() 
{
    // Bloque try-catch para manejar posibles errores al configurar la funcionalidad del buscador de cursos
    try
    {
        // Obtenemos el input de búsqueda de cursos por su ID
        const searchInput = document.getElementById('course-search');
        
        // Asociamos un listener al evento 'input' (cada vez que el usuario escribe)
        searchInput.addEventListener('input', function() 
        {
            // Obtenemos el valor actual del input, quitando espacios y pasando a minúsculas
            const searchTerm = this.value.trim().toLowerCase();
            
            // Llamamos a filterCourses para actualizar la lista según el término
            filterCourses(searchTerm);
        });
    }
    catch (error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al iniciar la página de cursos. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función que filtra los cursos según el término de búsqueda
function filterCourses(searchTerm) 
{
    // Bloque try-catch para manejar posibles errores al filtrar los cursos
    try
    {
        // Limpiamos el término de búsqueda
        const safeTerm = (searchTerm || '').toLowerCase().trim();

        // Verificamos si el término de búsqueda está vacío después de la limpieza
        if (!safeTerm) 
        {
            // Si no hay término de búsqueda, mostramos todos los cursos
            coursesState.filteredCourses = [...coursesState.courses];
        }
        else 
        {
            // Si hay un término de búsqueda, filtramos los cursos
            const filtered = coursesState.courses.filter(course => 
            {
                // Obtenemos el título del curso
                const title = ((course.title || '') + '').toLowerCase();
                
                // Comprobamos si el título incluye el término de búsqueda
                return title.includes(safeTerm);
            });
            
            // Actualizamos el estado con los cursos filtrados
            coursesState.filteredCourses = filtered;
        }

        // Renderizamos la lista de cursos filtrados en la interfaz
        renderCourseList(coursesState.filteredCourses);
    }
    catch(error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al intentar filtrar los cursos. Por favor intentalo de nuevo.');
        
        // Redirigir a la página de error
        window.location.href = 'error.html';
    }

}

// Función para seleccionar un curso y navegar a la página de temas
function selectCourse(courseId) 
{   
    // Bloque try-catch para manejar posibles errores al seleccionar un curso
    try
    {
        // Convertimos el ID del curso a número para asegurar consistencia en el tipo de dato
        const validCourseId = Number(courseId);

        // Buscamos el curso seleccionado en el array de cursos usando el ID
        const selectedCourse = coursesState.courses.find(c => c.id === validCourseId);
        
        // Creamos un objeto con los datos del curso que queremos almacenar
        const courseData = 
        {
            // Almacenamos el ID del curso
            id: Number(selectedCourse.id),

            // Almacenamos el título del curso después de sanitizarlo
            title: selectedCourse.title
        };
        
        // Guardamos los datos del curso
        localStorage.setItem('selectedCourse', JSON.stringify(courseData));
        
        // Redirigimos al usuario a la página de temas del curso seleccionado
        window.location.href = 'topics.html';
    }
    catch(error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al intentar seleccionar el curso. Por favor intentalo de nuevo.');
        
        // Redirigir a la página de error
        window.location.href = 'error.html';
    }
        
}

// Exportamos las funciones que pueden ser usadas por otros módulos
export 
{ 
    initCoursesPage,
    renderCourseList, 
    setupCourseSearch,
    filterCourses,
    selectCourse    
};
