// Módulo para manejar la página de perfil de usuario, insignias y estadísticas
 
// Importamos las dependencias necesarias
import { getUserProgress, signOut, getBadges } from './supabase.js';

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

// Función que carga el perfil del usuario desde almacenamiento local o sesión
async function loadUserProfile() 
{
    //
    try 
    {
        // Obtener datos del usuario directamente de localStorage
        let userData = null;
        
        //
        const userStr = localStorage.getItem('user');
            
        //
        if (userStr) userData = JSON.parse(userStr);
        
        // Guardar los datos del usuario en el estado global
        profileState.userProfile = userData;
        
        // Cargar todas las medallas disponibles
        const badgesResult = await getBadges();
        
        // Calcular el número de temas aprobados por el usuario a partir de los exámenes ya cargados
        let approvedExams = 0;
        
        //
        if (profileState.userProgress && Array.isArray(profileState.userProgress.tests)) 
        {
            //
            const approvedTopics = new Set();
            
            //
            profileState.userProgress.tests.forEach(exam => 
            {
                //
                if (exam.topic_id && exam.total_questions > 0) 
                {
                    //
                    const scoreRatio = exam.correct_answers / exam.total_questions;
                    
                    //
                    if (scoreRatio >= 0.8) 
                    {
                        //
                        approvedTopics.add(exam.topic_id);
                    }
                }
            });

            //
            approvedExams = approvedTopics.size;
        }
        
        //
        badgesState.badges = Array.isArray(badgesResult) ? badgesResult : [];
        
        //
        badgesState.userApprovedExams = approvedExams;
        
        // Solo configurar la navegación de insignias si hay insignias disponibles
        if (badgesState.badges && badgesState.badges.length > 0) 
        {
            //
            setupBadgesNavigation();
        }
        
        // 
        const { data: userProgress, error } = await getUserProgress(userData.id);
        
        // 
        profileState.userProgress = userProgress || null;
        
        // Solo después de cargar el progreso, inicializar el filtro de mes
        await initMonthFilter();
            
        // 
        const profileName = document.getElementById('profile-name');
        
        //
        const profileEmail = document.getElementById('profile-email');
        
        //
        const greetingName = document.getElementById('user-greeting-name');
        
        // 
        const displayName = userData.name || userData.username || userData.email?.split('@')[0] || 'Usuario';
        
        // 
        if (profileName) profileName.textContent = displayName;
        
        //
        if (profileEmail) profileEmail.textContent = userData.email || 'No disponible';
        
        // Actualizar el nombre en el mensaje de bienvenida
        if (greetingName) greetingName.textContent = displayName;
        
        //
        if (profileState.userProgress) 
        {
            //
            const studyMinutesTotalElement = document.getElementById('study-minutes-total');
            
            //
            const examsTakenElement = document.getElementById('exams-taken');
            
            //
            const approvedTopicsElement = document.getElementById('approved-topics-total'); 
            
            //
            const month = profileState.selectedMonth;
            
            //
            const year = profileState.selectedYear;
            
            //
            const key = `${month}-${year}`;
            
            //
            const minutes = profileState.userProgress.practiceByMonth?.[key] || 0;
            
            //
            if (studyMinutesTotalElement) studyMinutesTotalElement.textContent = minutes.toFixed(2);
            
            //
            const exams = profileState.userProgress.examsByMonth?.[key] || 0;
            
            //
            if (examsTakenElement) examsTakenElement.textContent = exams;
            
            //
            const topics = profileState.userProgress.approvedTopicsByMonth?.[key] || 0;
            
            //
            if (approvedTopicsElement) approvedTopicsElement.textContent = topics;
        }
        
        // 
        const month = profileState.selectedMonth;
        
        //
        const year = profileState.selectedYear;
        
        // Cargar los datos de perfil filtrados por mes y año
        loadProfileData(month, year);
    } 
    catch (error) 
    {
        // Registrar cualquier error durante el proceso de carga
        console.error('Error al cargar el perfil:', error);
    }
};

// Función que actualiza la visualización de la medalla actual
function updateBadgeDisplay() 
{    
    // Calcular el índice actual de la medalla, asegurando que esté dentro de los límites del array
    const currentBadgeIndex = Math.max(0, Math.min(badgesState.currentBadgeIndex, badgesState.badges.length - 1));
    const currentBadge = badgesState.badges[currentBadgeIndex];

    // Obtener referencias a los elementos del DOM
    var badgeName = document.getElementById('badge-name');
    var badgeDescription = document.getElementById('badge-description');
    var badgeProgress = document.getElementById('badge-progress');
    var badgeImage = document.getElementById('badge-image');
    var badgeTitle = document.getElementById('badge-title');
    var badgeRequiredExams = document.getElementById('badge-required-exams');

    if (currentBadge) {
        if (badgeName) badgeName.textContent = currentBadge.title || '';
        if (badgeDescription) badgeDescription.textContent = currentBadge.description || '';
        if (badgeProgress) badgeProgress.textContent = `Progreso: ${badgesState.userApprovedExams}/${currentBadge.necessary_exams}`;
        if (badgeImage) badgeImage.src = currentBadge.image_url || '';

        // Calcular si la medalla está desbloqueada o no
        const isUnlocked = currentBadge.necessary_exams === 0 || badgesState.userApprovedExams >= currentBadge.necessary_exams;
        const progress = currentBadge.necessary_exams === 0 ? 100 : Math.min(Math.round((badgesState.userApprovedExams / currentBadge.necessary_exams) * 100), 100);

        // Actualizar la imagen de la medalla y la clase CSS según si está desbloqueada
        if (badgeImage) {
            if (!isUnlocked) {
                badgeImage.classList.add('badge-locked');
            } else {
                badgeImage.classList.remove('badge-locked');
            }
            setTimeout(() => {
                badgeImage.src = currentBadge.image_url || 'img/badges/default-badge.png';
            }, 10);
        }

        if (badgeTitle) badgeTitle.textContent = currentBadge.title || 'Sin nombre';
        if (badgeRequiredExams) badgeRequiredExams.textContent = currentBadge.necessary_exams || '0';
        if (badgeProgress) badgeProgress.textContent = `${progress}%`;
    } else {
        // Si no hay insignia, limpia los campos visuales
        if (badgeName) badgeName.textContent = '';
        if (badgeDescription) badgeDescription.textContent = '';
        if (badgeProgress) badgeProgress.textContent = '';
        if (badgeImage) {
            badgeImage.src = '';
            badgeImage.classList.remove('badge-locked');
        }
    }
}

// Función que configura la navegación entre insignias
function setupBadgesNavigation() 
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
    newPrevButton.addEventListener('click', () => {
        // Calcular el índice anterior de la medalla (cíclico)
        badgesState.currentBadgeIndex = (badgesState.currentBadgeIndex - 1 + badgesState.badges.length) % badgesState.badges.length;
        
        // Actualizar la visualización de la medalla
        updateBadgeDisplay();
    });
    
    // Listener para navegar a la medalla siguiente
    newNextButton.addEventListener('click', () => {
        // Calcular el índice siguiente de la medalla (cíclico)
        badgesState.currentBadgeIndex = (badgesState.currentBadgeIndex + 1) % badgesState.badges.length;
        
        // Actualizar la visualización de la medalla
        updateBadgeDisplay();
    });
    
    // Mostrar la primera insignia al cargar la navegación
    // Asegurar que empezamos por la medalla con order_index más bajo
    badgesState.currentBadgeIndex = 0; 
    
    // Actualizar la visualización de la medalla
    updateBadgeDisplay();
}

// Función que inicializa la página de perfil y todos sus módulos
function initProfilePage() 
{
    // Verificar si hay usuario autenticado en localStorage/sessionStorage
    const user = checkAuthentication();
    
    // Cargar el sidebar de navegación de la app de forma asíncrona
    import('./utils.js').then(({ loadSidebar }) => {
        loadSidebar();
    });
    
    // Cargar el perfil del usuario y estadísticas
    loadUserProfile();
    
    // Inicializar la navegación de insignias (botones prev/next)
    setupBadgesNavigation();
    
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

// Inicializar la página cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => 
{
    // Inicializar la página de perfil con todas sus funcionalidades
    initProfilePage();
    
    // Configurar el evento para el filtro de mes (cambio de mes en el perfil)
    const monthFilter = document.getElementById('month-filter');
    
    // 
    monthFilter.addEventListener('change', function() 
    {
        // Obtener el mes seleccionado
        const selectedMonth = parseInt(this.value, 10);
        
        // Obtener el año actual
        const currentYear = new Date().getFullYear();
        
        // Recargar los datos del perfil con el nuevo mes y año
        loadProfileData(selectedMonth, currentYear);
    });
});

// Función que verifica la autenticación del usuario en localStorage/sessionStorage
function checkAuthentication() 
{
    // Variable para almacenar los datos del usuario si existen
    let user = null;
    
    // Intentar obtener datos del usuario de localStorage
    const userStr = localStorage.getItem('user');
    
    // Si hay datos en localStorage, parsear y asignar a la variable user
    if (userStr) 
    {
        // 
        user = JSON.parse(userStr);
        
        // 
        if (user && user.id) 
        {
            // 
            return user;
        }
    }

    // Si no hay usuario, redirigir al login de forma segura
    if (!user || !user.id) 
    {
        // 
        const safeLoginUrl = 'login.html';
        
        // 
        window.location.href = safeLoginUrl;
        
        // 
        return null;
    }
    
    // 
    return user;
}

// Función para actualizar la interfaz de usuario del perfil con datos del mes seleccionado
function updateProfileUI(profileData) 
{
    // Actualizar datos del usuario en el encabezado
    const userNameElement = document.querySelector('.user-name');
    
    //
    const avatarInitialsElement = document.querySelector('.avatar-initials');
    
    //
    const userGreetingNameElement = document.getElementById('user-greeting-name');
    
    // Intentar usar el nombre completo desde user_metadata si está disponible
    let displayName = profileData.user.name;
    
    // Verificar si tenemos acceso a los metadatos del usuario
    const user = checkAuthentication();
    
    //
    if (user && user.user_metadata && user.user_metadata.full_name) 
    {
        //
        displayName = user.user_metadata.full_name;
    }
    
    //
    if (userNameElement) userNameElement.textContent = displayName;
    
    //
    if (avatarInitialsElement) avatarInitialsElement.textContent = displayName.charAt(0);
    
    //
    if (userGreetingNameElement) userGreetingNameElement.textContent = displayName;
    
    // Actualizar tarjetas de estadísticas mensuales
    const coursesCompletedElement = document.getElementById('courses-completed');
    
    //
    const studyMinutesTotalElement = document.getElementById('study-minutes-total');
    
    //
    const examsTakenElement = document.getElementById('exams-taken');
    
    //
    if (coursesCompletedElement) coursesCompletedElement.textContent = profileData.monthly_stats.completed_courses;
    
    //
    if (studyMinutesTotalElement) studyMinutesTotalElement.textContent = profileData.monthly_stats.study_minutes;
    
    //
    if (examsTakenElement) examsTakenElement.textContent = profileData.monthly_stats.exams_taken;
    
    // Actualizar fecha mostrada
    const dateElement = document.querySelector('.date');
    
    //
    if (dateElement) dateElement.textContent = `${profileData.daily_study.monthName} ${profileData.daily_study.year || new Date().getFullYear()}`;
    
    //
    createLearningStatsChart(profileData.daily_study);
}

// Función para cargar datos de perfil con filtrado por mes y año
async function loadProfileData(month = new Date().getMonth() + 1, year = new Date().getFullYear()) 
{
    //
    try 
    {
        // Obtener usuario actual usando la función refactorizada
        const user = checkAuthentication();
        
        //
        const userId = user.id;
        
        //
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        // Generar datos de días para el mes seleccionado
        const daysInMonth = new Date(year, month, 0).getDate();
        
        //
        const dayLabels = Array.from({length: daysInMonth}, (_, i) => i + 1);

        // Inicializar array para minutos de práctica por día (todo en ceros inicialmente)
        let practiceMinutesData = Array(daysInMonth).fill(0);
        
        // Filtrar los tests del usuario para el mes y año seleccionados usando datos ya cargados
        const userProgress = profileState.userProgress;
        
        // 
        let userTests = [];
        
        // 
        let error = null;
        
        // 
        if (userProgress && userProgress.tests && userProgress.tests.length > 0) 
        {
            // 
            userTests = userProgress.tests.filter(test => {
                // 
                if (!test.start_time) return false;
                
                // 
                const date = new Date(test.start_time);
                
                // 
                return date.getMonth() + 1 === month && date.getFullYear() === year;
            });
        }
        // 
        let totalPracticeMinutes = "0.00";
        
        // 
        let examsTaken = 0;
        
        // 
        let hasRealData = false;
        
        // 
        let approvedTopics = new Set();
        
        // 
        if (userTests && userTests.length > 0) 
        {
            //
            examsTaken = userTests.length;
            
            // 
            userTests.forEach(test => 
            {
                //
                if (test.score >= 80 && test.topic_id) 
                {
                    //
                    approvedTopics.add(test.topic_id);
                }
            });
            
            // 
            userTests.forEach(test => 
            {
                // Convertir fechas de string a objetos Date
                const startTime = new Date(test.start_time);
                
                //
                const endTime = new Date(test.end_time);
                
                // Calcular duración en minutos
                const diffMs = endTime.getTime() - startTime.getTime();
                
                //
                const durationMinutes = diffMs / 60000;
                    
                // Obtener día del mes (1-31) y añadir los minutos al array
                const day = startTime.getDate();

                //
                if (day >= 1 && day <= daysInMonth) 
                {
                    //
                    practiceMinutesData[day - 1] += durationMinutes;
                }
            });
            
            // Formatear valores con dos decimales
            practiceMinutesData = practiceMinutesData.map(minutes => parseFloat(minutes.toFixed(2)));
            
            // Calcular total de minutos
            totalPracticeMinutes = practiceMinutesData.reduce((sum, minutes) => sum + minutes, 0).toFixed(2);
            
            //
            hasRealData = true; // Se encontraron datos reales para el mes seleccionado
        } 
        else 
        {
            // No hay datos para el mes seleccionado
            if (error) 
            {
                // Si hubo un error al obtener los datos, mostrarlo en la consola
                console.error('Error al obtener pruebas del usuario:', error);
            } 
            else 
            {
                // Mostrar mensaje de "no hay datos" en el contenedor del gráfico
                const chartContainer = document.getElementById('learning-stats-chart');
             
                // Verificar que el contenedor y su padre existen en el DOM
                if (chartContainer && chartContainer.parentNode) 
                {
                    // Limpiar mensajes previos de "no hay datos"
                    const prevMsg = chartContainer.parentNode.querySelector('.no-data-message');
                    
                    // Si ya existe un mensaje previo, eliminarlo
                    if (prevMsg) prevMsg.remove();
                    
                    // Agregar un nuevo mensaje de "no hay datos" al DOM
                    chartContainer.parentNode.insertAdjacentHTML('beforeend', 
                        '<div class="no-data-message">No hay datos de práctica para el mes seleccionado</div>');
                }
            }
        }

        // Preparar el objeto con los datos de perfil que se mostrarán en la UI
        // Este objeto contiene información del usuario, estadísticas mensuales y datos diarios de estudio
        const profileData = {
            // Información del usuario
            user: {
                // Nombre del usuario (prioridad: name > username > 'Usuario')
                // Se utiliza para mostrar el nombre del usuario en la UI
                name: user.name || user.username || 'Usuario',
                // Inicial de nombre para avatar o UI
                // Se utiliza para mostrar la inicial del nombre del usuario en la UI
                initials: (user.name || user.username || 'U').charAt(0)
            },
            // Estadísticas mensuales del usuario
            monthly_stats: {
                // Número de temas con puntaje ≥ 80%
                // Se utiliza para mostrar el número de temas aprobados en la UI
                completed_courses: approvedTopics.size,
                // Minutos totales de estudio en el mes
                // Se utiliza para mostrar el total de minutos de estudio en la UI
                study_minutes: totalPracticeMinutes,
                // Exámenes realizados en el mes
                // Se utiliza para mostrar el número de exámenes realizados en la UI
                exams_taken: examsTaken
            },
            // Datos diarios de estudio para el gráfico
            daily_study: {
                // Etiquetas de días del mes
                // Se utiliza para crear las etiquetas del eje x en el gráfico
                labels: dayLabels,
                // Minutos de práctica por día
                // Se utiliza para crear los datos del gráfico
                values: practiceMinutesData,
                // Mes seleccionado
                // Se utiliza para mostrar el mes seleccionado en la UI
                month: month,
                // Año seleccionado
                // Se utiliza para mostrar el año seleccionado en la UI
                year: year,
                // Nombre del mes
                // Se utiliza para mostrar el nombre del mes en la UI
                monthName: monthNames[month - 1],
                // Indica si hay datos reales
                // Se utiliza para mostrar un mensaje de "no hay datos" en la UI si no hay datos reales
                hasRealData: hasRealData,
                // Unidad de medida para los valores
                // Se utiliza para mostrar la unidad de medida en la UI
                unit: 'minutos'
            }
        };
        
        // Actualizar la interfaz de usuario con los datos de perfil preparados
        // Esta función se utiliza para actualizar la UI con los datos de perfil
        updateProfileUI(profileData);        
    } 
    catch (error) 
    {
        // Mostrar en consola cualquier error ocurrido al cargar los datos de perfil
        // Esta línea se utiliza para mostrar cualquier error que ocurra al cargar los datos de perfil
        console.error('Error al cargar datos de perfil:', error);
    }
}

// Función para inicializar el filtro de mes
async function initMonthFilter() 
{
    // 
    try 
    {
        // 
        const monthSelector = document.getElementById('month-filter');
        
        // Obtener usuario actual usando la función refactorizada
        const user = checkAuthentication();
        
        // Usar el progreso del usuario almacenado en el estado global
        const userProgress = profileState.userProgress;
        
        // Hacer accesible los tests globalmente para tests.js
        window.userExamData = (userProgress && Array.isArray(userProgress.tests)) ? userProgress.tests : [];
        
        // Definir nombres de meses
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        // Limpiar el selector existente
        monthSelector.innerHTML = '';
        
        // Si tenemos datos de pruebas, calcular meses-año únicos
        if (userProgress && userProgress.tests && userProgress.tests.length > 0) 
        {
            // 
            const uniqueMonthYears = new Set();
            
            // 
            userProgress.tests.forEach(test => 
            {
                // 
                if (test.start_time) 
                {
                    // 
                    const date = new Date(test.start_time);
                    
                    // 
                    const month = date.getMonth() + 1;
                    
                    // 
                    const year = date.getFullYear();
                    
                    // 
                    uniqueMonthYears.add(`${month}-${year}`);
                } else 
                {
                    // 
                    console.warn('[Filtro Mes] Test sin start_time:', test);
                }
            });

            // 
            const monthYears = Array.from(uniqueMonthYears).map(str => 
            {
                // 
                const [month, year] = str.split('-').map(Number);
                
                // 
                return { month, year };
            }).sort((a, b) => b.year - a.year || b.month - a.month);
            
            // 
            monthYears.forEach(item => 
            {
                // 
                const option = document.createElement('option');
                
                // 
                option.value = `${item.month}-${item.year}`;
                
                // 
                option.textContent = `${monthNames[item.month - 1]} ${item.year}`;
                
                // 
                const currentDate = new Date();
                
                // 
                if (item.month === currentDate.getMonth() + 1 && item.year === currentDate.getFullYear()) 
                {
                    // 
                    option.selected = true;
                }

                // 
                monthSelector.appendChild(option);
            });
        } else 
        {
            // 
            const currentDate = new Date();
            
            // 
            const option = document.createElement('option');
            
            // 
            option.value = `${currentDate.getMonth() + 1}-${currentDate.getFullYear()}`;
            
            // 
            option.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
            
            // 
            option.selected = true;
            
            // 
            monthSelector.appendChild(option);
        }
        
        // Seleccionar el primer mes si ninguno está seleccionado
        if (monthSelector.selectedIndex === -1 && monthSelector.options.length > 0) 
        {
            //
            monthSelector.selectedIndex = 0;
        }
        
        // Configurar el evento de cambio de mes
        monthSelector.addEventListener('change', function() 
        {
            //
            const [month, year] = this.value.split('-').map(Number);
            
            //
            loadProfileData(month, year);
        });
        
        // Cargar datos iniciales con el mes seleccionado
        const [month, year] = monthSelector.value.split('-').map(Number);
        
        //
        loadProfileData(month, year);    
    } 
    catch (e) 
    {
        //
        console.error('Error al inicializar el filtro de mes:', e);
    }
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
    
    // Crear el gráfico
    window.learningChart = new Chart(ctx, {
        type: 'bar',
        
        data: 
        {
            labels: dailyStudy.labels,
            datasets: [{label: 'Minutos de práctica', data: dailyStudy.values, backgroundColor: primaryColor, borderColor: borderColor, borderWidth: 1, borderRadius: 4, barThickness: 8}]
        },
        
        options: {responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: {display: false},
                tooltip: {backgroundColor: '#333', titleColor: '#fff', bodyColor: '#fff', titleFont: {size: 14, weight: 'bold'}, bodyFont: {size: 12},
                    padding: 10,
                    callbacks: {
                        title: function(tooltipItems) {
                            //
                            const day = tooltipItems[0].label;
                            
                            //
                            return `Día ${day}`;
                        },
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
            scales: {
                y: {beginAtZero: true, grid: { display: true, color: 'rgba(0, 0, 0, 0.05)'},
                    ticks: {font: { size: 11 }, color: '#666',
                        callback: function(value) {
                            if (value === 0) return '0';
                            return value + ' min';
                        }
                    }
                },
                x: {
                    grid: {display: false},
                    ticks: {font: {size: 11}, color: '#666', autoSkip: true, maxRotation: 0, minRotation: 0,
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

// Exportar funciones y estados necesarios para uso en otros archivos
export 
{    
    profileState,
    badgesState,
    loadUserProfile,
    checkAuthentication,
    initProfilePage,
    updateBadgeDisplay,
    setupBadgesNavigation,
    loadProfileData,
    updateProfileUI,
    initMonthFilter,
    createLearningStatsChart
};
