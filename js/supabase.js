// Módulo para las funciones relacionadas a las consultas en Supabase

// Importamos las dependencias necesarias
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.24.0/+esm'

// Definimos las credenciales de Supabase
const supabaseUrl = 'https://hhprihwmymrrxqdviarl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocHJpaHdteW1ycnhxZHZpYXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNDU5NDYsImV4cCI6MjA2MzcyMTk0Nn0.V2HxscAezMiNYA23CZe7I2m7qWMrcbOf1kDVtfBLt-8'

// Creamos el cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey)

// Función para autenticación con Google
async function signInWithGoogle() 
{
    // Utilizamos un bloque try-catch para manejar cualquier error durante el proceso de autenticación
    try 
    {
        // Definimos la URL a la que será redirigido el usuario después de autenticarse
        const redirectUrl = 'http://localhost:8080/login.html';
        
        // Verificamos la sesión actual antes de iniciar OAuth para evitar inicios de sesión duplicados
        const { data: sessionData } = await supabase.auth.getSession();
        
        // Iniciamos el proceso de autenticación con OAuth mediante la API de Supabase
        const { data, error } = await supabase.auth.signInWithOAuth(
        {
            // Especificamos que queremos usar Google como proveedor de autenticación
            provider: 'google',
            
            // Configuramos opciones adicionales para el proceso de autenticación
            options: 
            {
                // Indicamos a dónde debe redirigir después de una autenticación exitosa
                redirectTo: redirectUrl,
                
                // Solicitamos acceso a la información del email y perfil del usuario de Google
                scopes: 'email profile',
                
                // Con false, permitimos que el navegador redirija automáticamente al usuario
                skipBrowserRedirect: false
            }
        })
        
        // Si todo fue exitoso, devolvemos los datos del usuario autenticado
        return data
    } 
    catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Ocurrió un error al intentar loguearte con tu cuenta. Por favor intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función para obtener el usuario actual
async function getCurrentUser() 
{
    // Utilizamos un bloque try-catch para manejar cualquier error durante la obtención de datos del usuario
    try 
    {
        // Realizamos una llamada a la API de Supabase para obtener la sesión actual del usuario
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        // Devolvemos los datos del usuario
        return sessionData.session.user
    } 
    catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Ocurrió un error al intentar obtener tu información. Por favor intentalo de nuevo.');
                
        // Redirigir a la página de error
        window.location.href = 'error.html';
    }
}

// Función para obtener todos los cursos disponibles
async function getCourses() 
{
    // Utilizamos un bloque try-catch para manejar posibles errores durante la obtención de los cursos
    try 
    {
        // Realizamos una consulta a la tabla 'courses' para obtener todos los cursos disponibles
        const { data: courses, error } = await supabase.from('courses').select('*')
        
        // Para cada curso, obtener el número de temas y ejercicios asociados mediante un mapeo
        const coursesWithCounts = await Promise.all(courses.map(async (course) => 
        {
            // Obtenemos el número total de temas asociados a este curso mediante una consulta con count
            const { count: topicsCount, error: topicsError } = await supabase.from('topics').select('id', { count: 'exact', head: true }).eq('course_id', course.id)
            
            // Obtenemos el número total de ejercicios asociados a este curso mediante una consulta con count
            const { count: exercisesCount, error: exercisesError } = await supabase.from('exercises').select('id', { count: 'exact', head: true }).eq('course_id', course.id)
                
            // Devolvemos un objeto con la información original del curso más los contadores calculados
            return {...course, topics_count: topicsCount || 0, exercise_count: exercisesCount || 0}
        }))
        
        // Devolvemos el array con todos los cursos enriquecidos con sus contadores
        return coursesWithCounts
    } 
    catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Ocurrió un error al intentar obtener los cursos. Por favor intentalo de nuevo.');
                
        // Redirigir a la página de error
        window.location.href = 'error.html';
    }
}

// Función para obtener los temas de un curso específico
async function getTopics(courseId) 
{
    // Utilizamos un bloque try-catch para manejar posibles errores durante la obtención de temas
    try 
    {
        // Realizamos una consulta a la tabla 'topics' para obtener todos los temas del curso, ordenados por su índice
        const { data: topics, error } = await supabase .from('topics') .select('*').eq('course_id', courseId).order('order_index', { ascending: true });
        
        // Para cada tema encontrado, obtenemos el número de ejercicios asociados mediante un mapeo
        const topicsWithExerciseCounts = await Promise.all(topics.map(async (topic) => 
        {
            // Consultamos la tabla 'exercises' para contar cuántos ejercicios están asociados a este tema
            const { count, error: countError } = await supabase.from('exercises').select('*', { count: 'exact', head: true }).eq('topic_id', topic.id);
            
            // Si no hubo error, devolvemos el tema con su conteo de ejercicios correspondiente
            return { ...topic, exercise_count: count || 0 };
        }));
        
        // Devolvemos el array con todos los temas enriquecidos con su conteo de ejercicios
        return topicsWithExerciseCounts;
    } 
    catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Ocurrió un error al intentar obtener los temas del curso. Por favor intentalo de nuevo.');
                
        // Redirigir a la página de error
        window.location.href = 'error.html';
    }
}

// Función para obtener el contenido teórico de un tema específico
async function getTheoryContent(topic_id)
{
    // Utilizamos un bloque try-catch para manejar posibles errores durante la obtención del contenido teórico
    try 
    {
        // Consultamos la tabla 'theory' filtrando por topic_id y ordenando por el campo 'order_index'
        const { data, error } = await supabase.from('theory').select('*').eq('topic_id', topic_id).order('order_index')
        
        // Si todo fue exitoso, devolvemos los datos obtenidos o un array vacío si no hay resultados
        return data || []
    } 
    catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Ocurrió un error al intentar obtener el contenido teórico. Por favor intentalo de nuevo.');
                
        // Redirigir a la página de error
        window.location.href = 'error.html';
    }
}

// Función para obtener los ejercicios de un tema específico
async function getExercises(topicId) 
{
    // Utilizamos un bloque try-catch para manejar posibles errores durante la obtención de los ejercicios
    try 
    {
        // Realizamos la consulta a la tabla 'exercises' filtrando por el ID del tema
        const { data, error } = await supabase.from('exercises').select('*').eq('topic_id', topicId);
           
        // Devolvemos los datos obtenidos o un array vacío si no hay resultados
        return data || [];
    } 
    catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Ocurrió un error al intentar obtener los ejercicios. Por favor intentalo de nuevo.');
                
        // Redirigir a la página de error
        window.location.href = 'error.html';
    }
}

// Función para guardar la información de una prueba completada
async function saveUserTest(userData) 
{
    // Bloque try-catch para manejar posibles errores al momento de intentar guardar los resultados de un examen
    try 
    {
        // Obtenemos la sesión actual de Supabase para identificar al usuario autenticado
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        // Extraemos el ID del usuario autenticado de la sesión
        const authenticatedUserId = sessionData.session.user.id;
                
        // Extraemos el topic_id del objeto recibido
        const { topic_id } = userData;
        
        // Extraemos el course_id del objeto recibido
        const courseId = userData.course_id || null;
        
        // Creamos un objeto con los resultados del examen
        const validatedData = 
        {
            // ID del usuario que realizó el examen
            user_id: authenticatedUserId, 
            
            // ID del curso asociado al examen (convertido a número)
            course_id: Number(courseId),
            
            // ID del tema asociado al examen (convertido a número)
            topic_id: Number(topic_id),
            
            // Fecha y hora de inicio del examen
            start_time: userData.start_time,
            
            // Fecha y hora de finalización del examen
            end_time: userData.end_time,
            
            // Duración esperada del examen en minutos (convertida a número)
            expected_duration: userData.expected_duration ? Number(userData.expected_duration) : null,
            
            // Tipo de finalización del examen
            completion_type: userData.completion_type,
            
            // Número total de preguntas del examen (convertido a número)
            total_questions: Number(userData.total_questions),
            
            // Número de respuestas correctas en el examen (convertido a número)
            correct_answers: Number(userData.correct_answers),
            
            // Fecha y hora de creación del registro (siempre la hora actual)
            created_at: new Date().toISOString()
        };
        
        // Guardamos los resultados de la prueba en la tabla 'user_tests' de Supabase
        const { data, error } = await supabase.from('user_tests').insert([validatedData]).select();
        
        // Retornamos el resultado de la inserción
        return { data };
    } catch (e) 
    {
        // Si ocurre un error, guardamos un mensaje en localStorage para mostrarlo en la página de error
        localStorage.setItem('ErrorMessage', 'Ocurrió un error al intentar guardar tus resultados. Por favor intentalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función para obtener el progreso de aprendizaje del usuario
async function getUserProgress(userId) 
{
    // Usamos un bloque try-catch para manejar errores durante la obtención del progreso
    try 
    {
        // Consultamos la tabla 'user_tests' para obtener todos los exámenes realizados por el usuario, ordenados por fecha de inicio ascendente
        const { data: testsData, error } = await supabase.from('user_tests').select('*').eq('user_id', userId).order('start_time', { ascending: true });
        
        // Inicializamos el objeto donde se guardarán los minutos de práctica agrupados por mes/año
        const practiceByMonth = {};
        
        // Inicializamos el objeto donde se guardará la cantidad de exámenes realizados agrupados por mes/año
        const examsByMonth = {};
        
        // Inicializamos el objeto donde se guardará la cantidad de temas aprobados agrupados por mes/año
        const approvedTopicsByMonth = {};
        
        // Si la consulta devolvió exámenes, procesamos cada uno para agrupar estadísticas
        if (testsData && testsData.length > 0) 
        {
            // Mapa auxiliar: para cada mes/año, guardaremos un Set de topic_id aprobados (para no contar el mismo tema varias veces en el mismo mes)
            const approvedTopicsMap = {};
            
            // Recorremos cada examen realizado por el usuario
            testsData.forEach(test => 
            {
                // Convertimos la fecha de inicio del examen a objeto Date
                const startTime = new Date(test.start_time);
                
                // Convertimos la fecha de fin del examen a objeto Date
                const endTime = new Date(test.end_time);
                
                // Calculamos la duración del examen en milisegundos
                const durationMs = endTime.getTime() - startTime.getTime();
                
                // Convertimos la duración a minutos
                const minutes = durationMs / 60000;
                
                // Obtenemos el mes de la fecha de inicio
                const month = startTime.getMonth() + 1;
                
                // Obtenemos el año de al fecha de inicio                
                const year = startTime.getFullYear();
                
                // Creamos una clave única para el mes y año
                const monthYearKey = `${month}-${year}`;

                // Si aún no existe el mes, inicializamos en 0
                if (!practiceByMonth[monthYearKey]) practiceByMonth[monthYearKey] = 0;
                
                // Sumamos los minutos de este examen al mes correspondiente
                practiceByMonth[monthYearKey] += minutes;

                // Si aún no existe el mes, inicializamos en 0
                if (!examsByMonth[monthYearKey]) examsByMonth[monthYearKey] = 0;
                
                // Sumamos 1 examen al mes correspondiente
                examsByMonth[monthYearKey] += 1;

                // Si aún no existe el set para ese mes, lo creamos
                if (!approvedTopicsMap[monthYearKey]) approvedTopicsMap[monthYearKey] = new Set();
                
                // Si el examen tiene topic_id y preguntas válidas
                if (test.topic_id && test.total_questions > 0) 
                {
                    // Calculamos el porcentaje de respuestas correctas
                    const scoreRatio = test.correct_answers / test.total_questions;
                    
                    // Si el usuario aprobó +80%
                    if (scoreRatio >= 0.8) 
                    {
                        // Agregamos el topic_id al set de ese mes
                        approvedTopicsMap[monthYearKey].add(test.topic_id);
                    }
                }
            });

            // Convertimos los sets de topic_id aprobados a la cantidad de temas aprobados por mes
            Object.keys(approvedTopicsMap).forEach(key => {approvedTopicsByMonth[key] = approvedTopicsMap[key].size;});
        }
        
        // Retornamos un objeto con los datos de progreso del usuario
        return {
            data: 
            {
                // Minutos de práctica agrupados por mes y año
                practiceByMonth,
                
                // Exámenes realizados agrupados por mes y año
                examsByMonth,
                
                // Temas aprobados agrupados por mes y año
                approvedTopicsByMonth,
                
                // Array completo de exámenes realizados
                tests: testsData || []
            }
        };
    } catch (e) 
    {
        // Si ocurre un error, guardamos el mensaje en localStorage
        localStorage.setItem('ErrorMessage', 'Hubo un error al intentar obtener tu progreso. Por favor intentalo de nuevo.');
        
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función para obtener las medallas disponibles
async function getBadges() 
{
    // Bloque try-catch para manejar posibles errores durante la obtención de las medallas
    try 
    {
        // Obtenemos todas las medallas ordenadas
        const { data, error } = await supabase.from('badges').select('*').order('order_index', { ascending: true });
            
        // Si la consulta fue exitosa, retornamos el array de medallas (data)
        return data;
    } 
    catch (error) 
    {
        // Guardamos un mensaje de error en localStorage para mostrarlo en la página de error
        localStorage.setItem('ErrorMessage', 'Ocurrió un error al intentar obtener tus medallas. Por favor intentalo de nuevo.');
                
        // Redirigir a la página de error
        window.location.href = 'error.html';
    }
}

// Función para cerrar sesión y limpiar el estado local
async function signOut() 
{
    // Usamos un bloque try-catch para manejar cualquier error durante el proceso de cierre de sesión
    try 
    {
        // Cerramos la sesión del usuario en Supabase
        const { error } = await supabase.auth.signOut()
        
        // Si ocurre un error al cerrar sesión, lanzamos la excepción
        if (error) throw error;
        
        // Limpiamos el usuario autenticado del almacenamiento local
        localStorage.removeItem('user');
        
        // Limpiamos el contador de intentos fallidos de login
        localStorage.removeItem('failed_login_attempts');
        
        // Limpiamos la marca de bloqueo temporal por intentos fallidos
        localStorage.removeItem('login_lockout_until');
        
        // Redireccionamos al usuario a la página de login
        window.location.href = 'login.html';
        
        // Retornamos true para indicar que el cierre de sesión fue exitoso
        return true;
    } catch (error) 
    {
        // Si ocurre un error, guardamos el mensaje en localStorage para mostrarlo en la página de error
        localStorage.setItem('ErrorMessage', 'Ocurrió un error al intentar cerrar sesión. Por favor inténtalo de nuevo.');
        
        // Redirigimos al usuario a la página de error
        window.location.href = 'error.html';
        
        // Retornamos false para indicar que el cierre de sesión falló
        return false;
    }
}

// Exportamos para los módulos que lo necesiten
export 
{ 
    supabase,
    getUserProgress,
    signOut,
    signInWithGoogle,
    getCurrentUser,
    getCourses,
    getTheoryContent,
    getTopics,
    getExercises,
    saveUserTest,
    getBadges
}
