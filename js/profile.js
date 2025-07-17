// Módulo para manejar la página de perfil de usuario, insignias y estadísticas
 
// Importamos las dependencias necesarias
import { getUserProgress, signOut, getBadges } from './supabase.js';
import { loadSidebar } from './utils.js';

// Estado global del perfil
const profileState = 
{
    // Información del perfil de usuario
    userProfile: null,
    
    // Mes seleccionado para filtrar estadísticas (1-12)
    selectedMonth: new Date().getMonth() + 1,
    
    // Año seleccionado para filtrar estadísticas
    selectedYear: new Date().getFullYear(),
    
    // Progreso del usuario
    userProgress: null
};

// Estado global de insignias (badges)
const badgesState = 
{
    // Colección de insignias disponibles
    badges: [],
    
    // Índice de la insignia actualmente mostrada
    currentBadgeIndex: 0,
    
    // Número de exámenes aprobados por el usuario
    userApprovedExams: 0
};

// Inicializar la página cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => 
{
    // Inicializar la página de perfil con todas sus funcionalidades
    initProfilePage();
});
   
// Función que inicializa la página de perfil y todos sus módulos
function initProfilePage() 
{
    // Cargar el sidebar de navegación de la app de forma asíncrona
    loadSidebar();
    
    // Cargar el perfil del usuario y estadísticas
    loadUserProfile();
    
    // Configurar el botón para regresar a la página principal
    const backButton = document.querySelector('.back-link');
    
    // 
    backButton.addEventListener('click', (e) => 
    {
        // Prevenir el comportamiento por defecto del enlace
        e.preventDefault();
        
        // Definir la URL de destino segura
        const safeUrl = 'index.html';
        
        // Redirigir al usuario a la URL segura
        window.location.href = safeUrl;
    });
}

// Función que carga el perfil del usuario desde almacenamiento local o sesión
async function loadUserProfile() 
{
    // Bloque try-catch para manejar posibles errores durante la carga del perfil
    try 
    {
        // Definimos la variable donde almacenaremos los datos del usuario
        let userData = null;
        
        // Obtenemos los datos del usuario desde localStorage
        const userStr = localStorage.getItem('user');
            
        // Parseamos los datos del usuario
        userData = JSON.parse(userStr);
        
        // Guardamos los datos del usuario en el estado global
        profileState.userProfile = userData;

        // Obtenemos el elemento donde se colocará el nombre del usuario en el mensaje de bienvenida
        const greetingName = document.getElementById('user-greeting-name');
        
        // Definimos el nombre del usuario
        const displayName = userData.user_metadata.name;

        // Definimos el nombre del usuario en el mensaje de bienvenida
        greetingName.textContent = displayName;
        
        // Obtenemos el progreso del usuario
        const { data: userProgress } = await getUserProgress(userData.id);
        
        // Almacenamos el progreso del usuario
        profileState.userProgress = userProgress;
        
        // Definimos la variable para almacenar el número de exámenes aprobados por el usuario
        let approvedExams = 0;
        
        // Si el usuario tiene progreso y el progreso es un array
        if (profileState.userProgress && Array.isArray(profileState.userProgress.tests)) 
        {
            // Definimos la variable para almacenar los temas aprobados por el usuario
            const approvedTopics = new Set();
            
            // Recorremos todos los exámenes del usuario
            profileState.userProgress.tests.forEach(exam => 
            {
                // Si el examen tiene un tema asignado, preguntas y respuestas correctas
                if (exam.topic_id && exam.total_questions > 0 && exam.correct_answers > 0) 
                {
                    // Calculamos el ratio de respuestas correctas sobre el total de preguntas
                    const scoreRatio = exam.correct_answers / exam.total_questions;
                    
                    // Si el ratio es mayor o igual a 0.8
                    if (scoreRatio >= 0.8) 
                    {
                        // Agregamos el tema a la lista de temas aprobados
                        approvedTopics.add(exam.topic_id);
                    }
                }
            });

            // Calculamos el número de exámenes aprobados
            approvedExams = approvedTopics.size;
        }
        
        // Solo después de cargar el progreso, inicializar el filtro de mes
        await initMonthFilter();
        
        // Obtenemos el mes seleccionado 
        const month = profileState.selectedMonth;
        
        // Obtenemos el año seleccionado
        const year = profileState.selectedYear;
        
        // Cargar los datos de perfil para el mes y año seleccionado
        loadProfileData(month, year);

        // Obtenemos todas las medallas disponibles
        const badgesResult = await getBadges();
        
        // Almacenamos las insignias
        badgesState.badges = Array.isArray(badgesResult) ? badgesResult : [];
        
        // Almacenamos el número de exámenes aprobados por el usuario
        badgesState.userApprovedExams = approvedExams;
        
        // Configuramos la navegación de insignias
        setupBadgesNavigation();
    } 
    catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al cargar los datos de tu perfil. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
};

// Función para inicializar el filtro de mes
async function initMonthFilter() 
{
    // Bloque try-catch para manejar cualquier posible error durante la inicialización del filtro de mes
    try 
    {
        // Obtenemos el elemento del filtro de mes
        const monthSelector = document.getElementById('month-filter');
        
        // Usar el progreso del usuario almacenado en el estado global
        const userProgress = profileState.userProgress;
        
        // Hacer accesible los tests globalmente para tests.js
        window.userExamData = (userProgress && Array.isArray(userProgress.tests)) ? userProgress.tests : [];
        
        // Definimos nombres de meses
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        // Limpiar el selector existente
        monthSelector.innerHTML = '';
        
        // Si tenemos datos de pruebas, calculamos meses-año únicos
        if (userProgress && userProgress.tests && userProgress.tests.length > 0) 
        {
            // Creamos un Set para almacenar meses-año únicos
            const uniqueMonthYears = new Set();
            
            // Recorremos todas las pruebas del usuario
            userProgress.tests.forEach(test => 
            {
                // Obtenemos la fecha de inicio de la prueba
                const date = new Date(test.start_time);
                
                // Obtenemos el mes de la fecha de inicio
                const month = date.getMonth() + 1;
                
                // Obtenemos el año de la fecha de inicio
                const year = date.getFullYear();
                
                // Agregamos el mes-año al Set
                uniqueMonthYears.add(`${month}-${year}`);
            });

            // Convertimos el set a un array y ordenamos por fecha descendente
            const monthYears = Array.from(uniqueMonthYears).map(str => 
            {
                // Obtenemos el mes y año de la fecha de inicio
                const [month, year] = str.split('-').map(Number);
                
                // Retornamos el mes y año
                return { month, year };
            }).sort((a, b) => b.year - a.year || b.month - a.month);
            
            // Recorremos el array de meses-año
            monthYears.forEach(item => 
            {
                // Creamos un elemento option
                const option = document.createElement('option');
                
                // Asignamos el valor del option
                option.value = `${item.month}-${item.year}`;
                
                // Asignamos el texto del option
                option.textContent = `${monthNames[item.month - 1]} ${item.year}`;
                
                // Obtenemos la fecha actual
                const currentDate = new Date();
                
                // Agregamos el option al selector
                monthSelector.appendChild(option);
            });
        } else 
        {
            // Mostramos un mensaje de no datos
        }
        
        // Seleccionamos el primer mes si ninguno está seleccionado
        if (monthSelector.selectedIndex === -1 && monthSelector.options.length > 0) 
        {
            // Seleccionamos el primer mes
            monthSelector.selectedIndex = 0;
        }
        
        // Configuramos el evento de cambio de mes
        monthSelector.addEventListener('change', function() 
        {
            // Obtenemos el mes y año seleccionados
            const [month, year] = this.value.split('-').map(Number);
            
            // Cargamos los datos del usuario
            loadProfileData(month, year);
        });
        
        // Obtenemos el mes y año seleccionados
        const [month, year] = monthSelector.value.split('-').map(Number);
        
        // Cargamos los datos iniciales del usuario
        loadProfileData(month, year);    
    } 
    catch (e) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al cargar los datos de tu perfil. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función que configura la navegación entre insignias
function setupBadgesNavigation() 
{
    // Bloque try-catch para manejar posibles errores durante la configuración de la navegación entre insignias
    try
    {
        // Obtener referencia al botón de medalla anterior
        const prevButton = document.querySelector('.prev-badge');

        // Obtener referencia al botón de medalla siguiente
        const nextButton = document.querySelector('.next-badge');

        // Clonar y reemplazar los botones para limpiar listeners previos
        prevButton.replaceWith(prevButton.cloneNode(true));

        // 
        nextButton.replaceWith(nextButton.cloneNode(true));

        // Obtener las nuevas referencias a los botones clonados
        const newPrevButton = document.querySelector('.prev-badge');

        // 
        const newNextButton = document.querySelector('.next-badge');

        // Listener para navegar a la medalla anterior
        newPrevButton.addEventListener('click', () => 
        {
            // Calcular el índice anterior de la medalla (cíclico)
            badgesState.currentBadgeIndex = (badgesState.currentBadgeIndex - 1 + badgesState.badges.length) % badgesState.badges.length;
            
            // Actualizar la visualización de la medalla
            updateBadgeDisplay();
        });

        // Listener para navegar a la medalla siguiente
        newNextButton.addEventListener('click', () => 
        {
            // Calcular el índice siguiente de la medalla (cíclico)
            badgesState.currentBadgeIndex = (badgesState.currentBadgeIndex + 1) % badgesState.badges.length;
            
            // Actualizar la visualización de la medalla
            updateBadgeDisplay();
        });

        // Mostrar la primera insignia al cargar la navegación
        badgesState.currentBadgeIndex = 0; 

        // Actualizar la visualización de la medalla
        updateBadgeDisplay();
    }
    catch (error)
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al cargar los datos de tu perfil. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función para obtener las estadísticas del usuario filtradas por mes y año
async function loadProfileData(month = new Date().getMonth() + 1, year = new Date().getFullYear()) 
{
    // Bloque try-catch para manejar posibles errores durante la obtención del resumen de estadísticas
    try 
    {
        // Obtenemos el progreso del usuario
        const userProgress = profileState.userProgress;
        
        // Definimos el array de exámenes realizados por el usuario para el mes-año seleccionado
        let userTests = [];
        
        // Si el usuario tiene exámenes realziados
        if (userProgress.tests.length > 0) 
        {
            // Filtramos los exámenes del usuario por mes y año
            userTests = userProgress.tests.filter(test => {
                // Obtenemos la fecha de inicio del examen
                const date = new Date(test.start_time);
                
                // Retornamos los exámenes que coinciden con el mes y año escogido
                return date.getMonth() + 1 === month && date.getFullYear() === year;
            });
        }

        // Definimos el número de exámenes realizados
        let examsTaken = 0;
        
        // Definimos el número de temas aprobados
        let approvedTopics = new Set();
        
        // Definimos el total de minutos de práctica
        let totalPracticeMinutes = "0.00";

        // Obtenemos la cantidad de días del mes seleccionado
        const daysInMonth = new Date(year, month, 0).getDate();

        // Definimos el array para los minutos de práctica por día
        let practiceMinutesData = Array(daysInMonth).fill(0);

        // Si el usuario tiene exámenes realizados en el mes-año seleccionado
        if (userTests.length > 0) 
        {
            // Definimos el número de exámenes realizados
            examsTaken = userTests.length;
            
            // Obtenemos la cantidad de temas aprobados
            userTests.forEach(test => 
            {
                // Calculamos el ratio de respuestas correctas sobre el total de preguntas
                const scoreRatio = test.correct_answers / test.total_questions;
                
                // Si el examen tiene un score superior a 80 es un tema aprobado
                if (scoreRatio >= 0.8 && test.topic_id) 
                {
                    // Agregamos el tema a la lista de temas aprobados
                    approvedTopics.add(test.topic_id);
                }
                
                // Convertimos la fecha de inicio a un objeto Date
                const startTime = new Date(test.start_time);
                
                // Convertimos la fecha de fin a un objeto Date
                const endTime = new Date(test.end_time);
                
                // Calculamos la duración
                const diffMs = endTime.getTime() - startTime.getTime();
                
                // Convertimos la duración a minutos
                const durationMinutes = diffMs / 60000;
                    
                // Obtenemos el día del mes
                const day = startTime.getDate();

                // Si el día está dentro del rango válido
                if (day >= 1 && day <= daysInMonth) 
                {
                    // Sumamos los minutos al día correspondiente
                    practiceMinutesData[day - 1] += durationMinutes;
                }
            });
            
            // Formateamos los valores a dos decimales
            practiceMinutesData = practiceMinutesData.map(minutes => parseFloat(minutes.toFixed(2)));
            
            // Calculamos el total de minutos de práctica del mes
            totalPracticeMinutes = practiceMinutesData.reduce((sum, minutes) => sum + minutes, 0).toFixed(2);
        } 
        else 
        {
            // Obtenemos el contenedor del gráfico
            const chartContainer = document.getElementById('learning-stats-chart');
            
            // Obtenemos el contenedor de mensaje de "no hay datos"
            const prevMsg = chartContainer.parentNode.querySelector('.no-data-message');
            
            // Si existe un mensaje previo, eliminamos el mensaje
            if (prevMsg) prevMsg.remove();
            
            // Agregamos un nuevo mensaje de "no hay datos"
            chartContainer.parentNode.insertAdjacentHTML('beforeend', '<div class="no-data-message">No hay datos de práctica para el mes seleccionado</div>');
        }

        // Definimos los nombres de los meses
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        // Obtenemos los números de los días del mes seleccionado
        const dayLabels = Array.from({length: daysInMonth}, (_, i) => i + 1);

        // Preparamos el objeto con los datos de perfil que se mostrarán en la UI
        const profileData = 
        {
            // Estadísticas mensuales del usuario
            monthly_stats: 
            {
                // Exámenes realizados en el mes
                exams_taken: examsTaken,

                // Número de temas aprobados
                completed_courses: approvedTopics.size,
                
                // Minutos totales de estudio en el mes
                study_minutes: totalPracticeMinutes
            },
            
            // Datos diarios de estudio para el gráfico
            daily_study: 
            {
                // Etiquetas de días del mes
                labels: dayLabels,
                
                // Minutos de práctica por día
                values: practiceMinutesData,
                
                // Mes seleccionado
                month: month,
                
                // Año seleccionado
                year: year,
                
                // Nombre del mes
                monthName: monthNames[month - 1],
                
                // Unidad de medida para los valores
                unit: 'minutos'
            }
        };
        
        // Actualizamos la interfaz de usuario con los datos de perfil preparados
        updateProfileUI(profileData);     
    } 
    catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Hubo un error al cargar los datos de tu perfil. Por favor, intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función para actualizar la interfaz de usuario del perfil con datos del mes seleccionado
function updateProfileUI(profileData) 
{
    // Obtenemos el elemento que contiente la cantidad de exámenes realizados
    const examsTakenElement = document.getElementById('exams-taken');
    
    // Obtenemos el elemento que contiente la cantidad de temas aprobados
    const coursesCompletedElement = document.getElementById('courses-completed');
    
    // Obtenemos el elemento que contiente la cantidad de minutos de práctica
    const studyMinutesTotalElement = document.getElementById('study-minutes-total');
    
    // Actualizamos el contenido del card de exámenes realizados
    examsTakenElement.textContent = profileData.monthly_stats.exams_taken;
    
    // Actualizamos el contenido del card de temas aprobados
    coursesCompletedElement.textContent = profileData.monthly_stats.completed_courses;
    
    // Actualizamos el contenido del card de minutos de práctica
    studyMinutesTotalElement.textContent = profileData.monthly_stats.study_minutes;
    
    // Actualizamos el gráfico de estadísticas de aprendizaje
    createLearningStatsChart(profileData.daily_study);
}

// Función para crear el gráfico de horas de práctica por día
function createLearningStatsChart(dailyStudy) 
{
    //
    const ctx = document.getElementById('learning-stats-chart');
    
    // Destruir gráfico anterior si existe
    if (window.learningChart) 
    {
        //
        window.learningChart.destroy();
    }
    
    // Definir colores para el gráfico usando la paleta de Hatun
    const primaryColor = '#C14B36';
    
    //
    const borderColor = '#AA4939';
    
    // Remover mensaje de no datos si existe
    const noDataMsg = ctx.parentNode.querySelector('.no-data-message');
    
    //
    if (noDataMsg) noDataMsg.remove();
    
    // Creamos el gráfico
    window.learningChart = new Chart(ctx, 
    {
        // Definimos el tipo de gráfico
        type: 'bar',
        
        // Definimos los datos del gráfico
        data: 
        {
            // 
            labels: dailyStudy.labels,

            // 
            datasets: [{label: 'Minutos de práctica', data: dailyStudy.values, backgroundColor: primaryColor, borderColor: borderColor, borderWidth: 1, borderRadius: 4, barThickness: 8}]
        },
        
        // Definimos las opciones del gráfico
        options: 
        {
            // 
            responsive: true, 
            
            // 
            maintainAspectRatio: false,
            
            // 
            plugins: 
            {
                // 
                legend: 
                {
                    // 
                    display: false
                },

                // 
                tooltip: 
                {
                    // 
                    backgroundColor: '#333', 
                    
                    // 
                    titleColor: '#fff', 
                    
                    // 
                    bodyColor: '#fff', 
                    
                    // 
                    padding: 10,

                    // 
                    titleFont: 
                    {
                        // 
                        size: 14, 
                        
                        // 
                        weight: 'bold'
                    }, 
                    
                    // 
                    bodyFont: 
                    {
                        // 
                        size: 12
                    },
                    
                    // 
                    callbacks: 
                    {
                        // 
                        title: function(tooltipItems) 
                        {
                            //
                            const day = tooltipItems[0].label;
                        
                            //
                            return `Día ${day}`;
                        },
                    
                        // 
                        label: function(context) 
                        {
                            //
                            const value = context.raw;
                        
                            //
                            if (value === 1) return '1 minuto';
                        
                            //
                            return ` ${value} minutos`;
                        }
                    }
                }
            },

            // 
            scales: 
            {
                // 
                y: 
                {
                    // 
                    beginAtZero: true, 
                    
                    // 
                    grid: 
                    { 
                        // 
                        display: true, 
                        
                        // 
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    
                    // 
                    ticks: 
                    {
                        // 
                        font: 
                        { 
                            // 
                            size: 11 
                        }, 
                        
                        // 
                        color: '#666',
                        
                        // 
                        callback: function(value) 
                        {
                            //
                            if (value === 0) return '0';
                            
                            //
                            return value + ' min';
                        }
                    }
                },
                
                // 
                x: 
                {
                    // 
                    grid: 
                    {
                        // 
                        display: false
                    },
                    
                    // 
                    ticks: 
                    {
                        // 
                        font: 
                        {
                            // 
                            size: 11
                        }, 
                        
                        // 
                        color: '#666', 
                        
                        // 
                        autoSkip: true, 
                        
                        // 
                        maxRotation: 0, 
                        
                        // 
                        minRotation: 0,
                        
                        // 
                        callback: function(value, index, ticks) 
                        {
                            // Mostrar todos los días del mes
                            return dailyStudy.labels[index];
                        }
                    }
                }
            }
        }
    });
    
    // Si no hay datos reales, mostrar mensaje
    if (!dailyStudy.hasRealData && !dailyStudy.values.some(v => v > 0)) 
    {
        //
        ctx.parentNode.insertAdjacentHTML('beforeend', 
            '<div class="no-data-message">No hay datos de práctica para este mes</div>');
    }
}

// Función que actualiza la visualización de la medalla actual
function updateBadgeDisplay() 
{   
    // Obtenemos el índice de la medalla actual
    const currentBadgeIndex = Math.max(0, Math.min(badgesState.currentBadgeIndex, badgesState.badges.length - 1));
    
    // Obtenemos la información de la medalla actual
    const currentBadge = badgesState.badges[currentBadgeIndex];

    // Obtenemos el elemento que contendrá la imagen de la medalla
    const badgeImage = document.getElementById('badge-image');
    
    // Obtenemos el elemento que contendrá el nombre de la medalla
    const badgeName = document.getElementById('badge-name');
    
    // Obtenemos el elemento que contendrá la cantidad de exámenes necesarios
    const badgeRequiredExams = document.getElementById('badge-required-exams');
    
    // Obtenemos el elemento que contendrá el porcentaje de avance
    const badgeProgress = document.getElementById('badge-progress');
    
    // Definimos si la medalla está desbloqueada o no
    const isUnlocked = currentBadge.necessary_exams === 0 || badgesState.userApprovedExams >= currentBadge.necessary_exams;
    
    // Si la medalla no está desbloqueada
    if (!isUnlocked) 
    {
        // Eliminamos la imagen
        badgeImage.src = '';

        // Agregamos la clase de medalla bloqueada
        badgeImage.classList.add('badge-locked');

        // Asignamos la imagen
        badgeImage.src = currentBadge.image_url;
    } else 
    {
        // Eliminamos la imagen
        badgeImage.src = '';

        // Eliminamos la clase de medalla bloqueada
        badgeImage.classList.remove('badge-locked');

        // Asignamos la imagen
        badgeImage.src = currentBadge.image_url;
    }

    // Asignamos el nombre de la medalla
    badgeName.textContent = currentBadge.title || '';

    // Si la medalla no requiere exámenes aprobados
    if (currentBadge.necessary_exams === 0)
    {
        // Asignamos la cantidad de exámenes necesarios
        badgeRequiredExams.textContent = 'Medalla de bienvenida';
    }
    else
    {
        // Asignamos la cantidad de exámenes necesarios
        badgeRequiredExams.textContent = currentBadge.necessary_exams;
    }    

    // Calculamos el progreso
    const progress = badgesState.userApprovedExams / currentBadge.necessary_exams;

    // Si la medalla no requiere exámenes aprobados
    if (currentBadge.necessary_exams === 0)
    {
        // Asignamos el progreso
        badgeProgress.textContent = '100%';
    }
    else
    {
        // Asignamos el progreso
        badgeProgress.textContent = Math.round(progress * 100) + '% (' + badgesState.userApprovedExams + '/' + currentBadge.necessary_exams + ')';
    }
}

// Exportar funciones y estados necesarios para uso en otros archivos
export 
{    
    profileState,
    badgesState,
    loadUserProfile,
    initProfilePage,
    updateBadgeDisplay,
    setupBadgesNavigation,
    loadProfileData,
    updateProfileUI,
    initMonthFilter,
    createLearningStatsChart
};
