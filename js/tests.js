// Importamos las dependencias necesarias
import { supabase, signOut } from './supabase.js'; 
import { loadSidebar } from './utils.js'; 

// Variable global para almacenar el usuario autenticado
let currentUser = null;

// Variable global para el mes seleccionado en el filtro
let currentMonth = null;

// Array global con todas las pruebas del usuario
let allTests = [];

// Array global con las pruebas filtradas por el mes seleccionado
let currentTests = [];

// Cuando el documento termina de cargar, se invoca la función principal de inicialización
document.addEventListener('DOMContentLoaded', initTestsPage);

// Función principal de inicialización de la página de historial de pruebas
async function initTestsPage() 
{
    // Bloque try-catch para manejar cualquier posible error durante la inicialización de la página de pruebas
    try
    {
        // Cargamos el sidebar
        loadSidebar();    
        
        // Obtenemos la sesión activa actual desde Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        // Asignamos el usuario autenticado a la variable global
        currentUser = session.user;
        
        // Guardamos el usuario en localStorage para persistencia local
        localStorage.setItem('user', JSON.stringify(currentUser));    

        // Realizamos una consulta a Supabase para obtener todos los exámenes del usuario
        const { data } = await supabase.from('user_tests').select('*, course:courses!course_id(id,title), topic:topics!topic_id(id,title)').eq('user_id', currentUser.id).order('end_time', { ascending: false });
        
        // Asignamos el resultado (array de pruebasa) a la variable global
        allTests = data || [];

        // Configuramos el filtro de mes en la UI según las pruebas disponibles
        setupMonthFilter();
            
        // Filtramos las pruebas por el mes seleccionado (por defecto el actual)
        filterTestsByMonth(currentMonth);
            
        // Actualizamos el resumen de estadísticas (minutos, exámenes, etc)
        updateSummary();
    }
    catch(error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al iniciar la página. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función para configurar el filtro de mes en la interfaz de usuario
async function setupMonthFilter() 
{
    // Bloque try-catch para manejar cualquier posible error durante la configuración del filtro de mes-año
    try
    {        
        // Obtenemos el elemento select del filtro de mes
        const monthFilter = document.getElementById('month-filter');
        
        // Array con los nombres de los meses para mostrar en la UI
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        // Limpiamos el contenido actual del filtro de mes para volver a llenarlo
        monthFilter.innerHTML = '';

        // Inicializamos el array que contendrá los objetos {month, year} únicos
        let monthYears = [];
        
        // Si existen tests cargados, procesamos para extraer los meses únicos
        if (allTests && allTests.length > 0) 
        {
            // Creamos un set para almacenar combinaciones únicas de mes-año encontradas en los tests
            const uniqueMonthYears = new Set();
            
            // Recorremos todos los tests y extraemos el mes y año de cada uno
            allTests.forEach(test => 
            {
                // Convertimos el campo start_time a objeto Date
                const date = new Date(test.start_time);
                
                // Obtenemos el mes (1-12) de la fecha
                const month = date.getMonth() + 1;
                
                // Obtenemos el año de la fecha
                const year = date.getFullYear();
                
                // Agregamos la combinación mes-año como string al set 
                uniqueMonthYears.add(`${month}-${year}`);
            });

            // Convertimos el set de strings mes-año a un array de objetos {month, year}
            monthYears = Array.from(uniqueMonthYears).map(str => 
            {
                // Separamos el string en mes y año y convertimos a número
                const [month, year] = str.split('-').map(Number);
                
                // Retornamos el objeto con mes y año
                return { month, year };
            })
            // Ordenamos los meses de más reciente a más antiguo
            .sort((a, b) => b.year - a.year || b.month - a.month);
            
            // Recorremos cada mes-año único para crear opciones en el select
            monthYears.forEach(item => 
            {
                // Creamos el elemento option para el select
                const option = document.createElement('option');
                
                // Asignamos el valor (ej: "7-2025")
                option.value = `${item.month}-${item.year}`;
                
                // Mostramos el nombre del mes y año en texto (ej: "Julio 2025")
                option.textContent = `${monthNames[item.month - 1]} ${item.year}`;
                
                // Obtenemos la fecha actual
                const now = new Date();

                // Si el mes y año coinciden con el actual, lo seleccionamos por defecto
                if (item.month === now.getMonth() + 1 && item.year === now.getFullYear()) 
                {
                    // Seleccionamos la opción
                    option.selected = true;
                }
                
                // Añadimos la opción al select
                monthFilter.appendChild(option);
            });
            
            // Si ninguna opción quedó seleccionada, selecciona la primera por defecto
            if (monthFilter.selectedIndex === -1 && monthFilter.options.length > 0) 
            {
                // Seleccionamos la primera opción
                monthFilter.selectedIndex = 0;
            }
            
            // Actualizamos la variable global con el valor seleccionado
            currentMonth = monthFilter.value;
        }

        // Configuramos el evento de cambio de mes-año
        monthFilter.addEventListener('change', function() 
        {
            // Asignamos el valor seleccionado al mes actual
            currentMonth = this.value;
            
            // Filtramos las pruebas por el mes seleccionado
            filterTestsByMonth(currentMonth);
            
            // Actualizamos el resumen
            updateSummary();
            
            // Actualizamos el título del mes
            const [month, year] = currentMonth.split('-').map(Number);
            
            // Obtenemos el elemento del título del mes
            const monthTitle = document.getElementById('current-month');
            
            // Si el elemento existe, actualizamos su contenido
            if (monthTitle) 
            {
                // Actualizamos el contenido del título del mes
                monthTitle.textContent = `${monthNames[month - 1]} ${year}`;
            }
        });
        
        // Actualizamos el título del mes inicialmente
        const [month, year] = currentMonth.split('-').map(Number);
        
        // Obtenemos el elemento del título del mes
        const monthTitle = document.getElementById('current-month');
        
        // Actualizamos el contenido del título del mes
        monthTitle.textContent = `${monthNames[month - 1]} ${year}`;
    }
    catch(error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al iniciar la página. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        // window.location.href = 'error.html';
    }
}

// Función para filtrar pruebas por mes
function filterTestsByMonth(monthFilter) 
{
    // Extraemos mes y año
    const [month, year] = monthFilter.split('-');
    
    // Filtramos las pruebas por mes y año
    currentTests = allTests.filter(test => 
    {
        // Convertimos la fecha de inicio a objeto Date
        const date = new Date(test.start_time);
        
        // Filtramos las pruebas por mes y año
        return date.getMonth() + 1 === parseInt(month) && date.getFullYear() === parseInt(year);
    });
    
    // Renderizamos las pruebas
    renderTests();
}

// Función para renderizar historial de pruebas en formato tabla
function renderTests() 
{
    // Bloque try-catch para manejar cualquier posible error durante el renderizado del historial de pruenbas
    try
    {
        // Obtenemos el contenedor de pruebas en el DOM
        const container = document.getElementById('tests-list');
        
        // Agregamos la clase de contenedor de tabla para el diseño
        container.classList.add('tests-table-container');
        
        // Limpiamos el contenido anterior del contenedor
        container.innerHTML = '';
        
        // Creamos el elemento tabla para mostrar los tests
        const table = document.createElement('table');
        
        // Asignamos la clase CSS a la tabla para estilos
        table.className = 'tests-table';
        
        // Creamos el encabezado de la tabla (thead)
        const thead = document.createElement('thead');
        
        // Definimos las columnas del encabezado en HTML
        thead.innerHTML = `
            <tr>
                <th class="col-fecha">Fecha</th>
                <th class="col-curso">Curso</th>
                <th class="col-tema">Tema</th>
                <th class="col-hora">Hora de inicio</th>
                <th class="col-hora">Hora de fin</th>
                <th class="col-duracion">Programada</th>
                <th class="col-duracion">Real</th>
                <th class="col-finalizacion">Finalización</th>
                <th class="col-puntuacion">Puntuación</th>
            </tr>
        `;

        // Agregamos el encabezado a la tabla
        table.appendChild(thead);
        
        // Creamos el cuerpo de la tabla (tbody)
        const tbody = document.createElement('tbody');
        
        // Recorremos cada test filtrado por el mes seleccionado
        currentTests.forEach(test => 
        {
            // Convertimos la fecha de inicio a objeto Date
            const startDate = new Date(test.start_time);
            
            // Convertimos la fecha de fin a objeto Date
            const endDate = new Date(test.end_time);
            
            // Calculamos la duración total en milisegundos
            const durationMs = endDate - startDate;
            
            // Calculamos la duración en segundos
            const durationSeconds = Math.floor(durationMs / 1000);
            
            // Calculamos la duración en minutos (2 decimales)
            const durationMinutes = (durationSeconds / 60).toFixed(2);
            
            // Calculamos la puntuación del test (porcentaje de respuestas correctas)
            const score = Math.round((test.correct_answers / test.total_questions) * 100);
            
            // Creamos la fila de la tabla para este test
            const row = document.createElement('tr');
            
            // Determinamos la clase CSS según la puntuación
            let resultClass = 'score-poor';
            
            // Clasificación visual de la puntuación
            if (score >= 80) 
            {
                // Excelente
                resultClass = 'score-excellent';
            } 
            else if (score >= 60) 
            {
                // Bien
                resultClass = 'score-good';
            } 
            else if (score >= 40) 
            {
                // Promedio
                resultClass = 'score-average';
            }
            
            // Obtenemos el nombre del curso (o texto por defecto)
            const courseName = test.course?.title || 'Curso desconocido';
            
            // Obtenemos el nombre del tema (o texto por defecto)
            const topicName = test.topic?.title || 'Tema desconocido';
            
            // Tipo de finalización
            const completionType = test.completion_type || 'No especificado';
            
            // Función auxiliar para formatear hora con AM/PM y segundos
            const formatTimeWithAMPM = (date) => 
            {
                // Obtenemos la hora
                const hours = date.getHours();
                
                // Obtenemos los minutos
                const minutes = date.getMinutes();
                
                // Obtenemos los segundos
                const seconds = date.getSeconds();
                
                // Determinamos AM/PM
                const ampm = hours >= 12 ? 'PM' : 'AM';
                
                // Convertimos a formato 12 horas
                const hour12 = hours % 12 || 12; 
                
                // Formateamos minutos
                const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
                
                // Formateamos segundos
                const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
                
                // Retornamos la hora formateada
                return `${hour12}:${formattedMinutes}:${formattedSeconds} ${ampm}`;
            };
            
            // Determinamos cómo mostrar la duración programada
            const expectedDurationText = test.expected_duration === null || test.expected_duration === 999 ? 'Sin límite' : `${test.expected_duration} min`;
            
            // Formateamos la duración real en minutos con 2 decimales
            const durationRealText = `${durationMinutes} min`;
            
            // Función para formatear fecha como dd/mm/yy
            const formatDateDDMMYY = (date) => 
            {
                // Día
                const day = date.getDate().toString().padStart(2, '0');
                
                // Mes
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                
                // Año
                const year = date.getFullYear().toString().substring(2); // Solo los últimos 2 dígitos
                
                // Retornamos la fecha formateada
                return `${day}/${month}/${year}`;
            };
            
            // Creamos la fila
            row.innerHTML = `
                <td><span class="date-text">${formatDateDDMMYY(startDate)}</span></td>
                <td><span class="course-text">${courseName}</span></td>
                <td><span class="topic-text">${topicName}</span></td>
                <td><span class="time-text">${formatTimeWithAMPM(startDate)}</span></td>
                <td><span class="time-text">${formatTimeWithAMPM(endDate)}</span></td>
                <td><span class="duration-text">${expectedDurationText}</span></td>
                <td><span class="duration-text">${durationRealText}</span></td>
                <td><span class="completion-type">${completionType}</span></td>
                <td><span class="score-badge ${resultClass}">${score}% <span class="score-detail">(${test.correct_answers}/${test.total_questions})</span></span></td>
            `;
            
            // Añadimos la fila al tbody
            tbody.appendChild(row);
        });
        
        // Añadimos el tbody a la tabla
        table.appendChild(tbody);
        
        // Añadimos la tabla al contenedor
        container.appendChild(table);
    }
    catch(error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al intentar cargar tu historial de pruebas. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Actualizamos el resumen de estadísticas
function updateSummary() 
{
    // Total de pruebas
    const totalTestsEl = document.getElementById('total-tests');
    
    // Promedio de puntuación
    const avgScoreEl = document.getElementById('avg-score');
    
    // Promedio de tiempo
    const avgTimeEl = document.getElementById('avg-time');
    
    // Total de pruebas
    totalTestsEl.textContent = currentTests.length;
    
    // Total de puntuación
    let totalScore = 0;
    
    // Recorremos las pruebas
    currentTests.forEach(test => 
    {
        // Sumamos la puntuación
        totalScore += (test.correct_answers / test.total_questions) * 100;
    });

    // Promedio de puntuación
    const avgScore = totalScore / currentTests.length;
    
    // Promedio de puntuación
    avgScoreEl.textContent = `${avgScore.toFixed(2)}%`;
    
    // Tiempo medio
    let totalTime = 0;
    
    // Recorremos las pruebas
    currentTests.forEach(test =>     
    {
        // Fecha de inicio
        const start = new Date(test.start_time);
        
        // Fecha de fin
        const end = new Date(test.end_time);
        
        // Sumamos la duración
        totalTime += (end - start) / (1000 * 60);
    });
    
    // Promedio de tiempo
    const avgTime = totalTime / currentTests.length;
    
    // Promedio de tiempo
    avgTimeEl.textContent = `${avgTime.toFixed(2)} min`;
}
