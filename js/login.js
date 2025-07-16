// Módulo para la gestión de autenticación

// Importamos los módulos necesarios
import { supabase, signInWithGoogle, signOut } from './supabase.js';

// Variable de control para evitar múltiples intentos de autenticación simultáneos
let authInProgress = false; 

// Configuración de seguridad y manejo de sesión
const SESSION_CONFIG = 
{
    // Configuraciones de seguridad
    security: 
    {
        // Número máximo de intentos fallidos de inicio de sesión antes de bloquear temporalmente
        maxFailedAttempts: 5,

        // Tiempo de bloqueo en milisegundos después de exceder los intentos máximos (15 minutos)
        lockoutTime: 15 * 60 * 1000, 

        // Lista de páginas a las que se puede redirigir sin restricciones de sesión
        redirectWhitelist: ['index.html']
    },

    // Configuraciones de la sesión de usuario
    session: 
    {
        // Intervalo en milisegundos para verificar el estado de la sesión (5 minutos)
        checkInterval: 5 * 60 * 1000, 
    
        // Tiempo en milisegundos antes de que expire la sesión para mostrar advertencia (5 minutos)
        warningTime: 5 * 60 * 1000,
    
        // Tiempo máximo de inactividad antes de cerrar la sesión (30 minutos)
        idleTimeout: 30 * 60 * 1000, 
    
        // Tiempo en milisegundos antes de la expiración para renovar el token (10 minutos)
        refreshThreshold: 10 * 60 * 1000, 
    
        // Clave bajo la cual se almacenan los datos de sesión en el almacenamiento local
        storageKey: 'hatun_session_data',
    
        // Eventos del navegador que se consideran actividad del usuario
        events: ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    }
};

// Este objeto rastrea el estado actual de la sesión del usuario en tiempo real
let sessionState = 
{
    // Indica si hay una sesión activa
    isActive: false,
    
    // Marca de tiempo (en milisegundos) de la última actividad detectada del usuario
    lastActivity: Date.now(),
    
    // Referencias a temporizadores e intervalos
    idleTimeout: null,
    sessionCheckInterval: null
};

// Sistema unificado de gestión de sesión que maneja inactividad y validez
const sessionManager = 
{
    // Iniciar el sistema completo de monitoreo
    init() 
    {
        this.startActivityMonitoring();
        this.startValidityChecks();
        this.verifyInitialSession();
    },
    
    // Verificar el estado inicial de la sesión
    async verifyInitialSession() 
    {
        try 
        {
            const { data, error } = await supabase.auth.getSession();
            
            if (error || !data.session) 
            {
                // No hay sesión válida, mostrar formulario de login
                sessionState.isActive = false;
                showLoginForm();
                return false;
            }
            
            // Hay sesión válida
            sessionState.isActive = true;
            
            await handleSuccessfulAuth(data.session.user);
            
            return true;
        } catch (error) 
        {
            console.error('Error al verificar la sesión inicial:', error);
            
            sessionState.isActive = false;
            
            showLoginForm();
            
            return false;
        }
    },
    
    // Monitoreo de actividad del usuario
    startActivityMonitoring() 
    {
        // Limpia el temporizador existente
        clearTimeout(sessionState.idleTimeout);
        
        // Actualiza el timestamp de actividad
        sessionState.lastActivity = Date.now();
        
        // Configura detector de inactividad
        sessionState.idleTimeout = setTimeout(this.handleInactivity.bind(this), SESSION_CONFIG.session.idleTimeout);
        
        // Configura listeners de eventos de usuario una sola vez
        this.setupActivityListeners();
    },
    
    // Configurar escuchadores de eventos solo una vez
    setupActivityListeners() 
    {
        // Solo configura listeners si no se ha hecho antes
        if (!this._listenersConfigured) 
        {
            const resetTimer = () => this.startActivityMonitoring();
            
            // Asocia todos los eventos definidos
            SESSION_CONFIG.session.events.forEach(event => 
                window.addEventListener(event, resetTimer, { passive: true })
            );
            
            this._listenersConfigured = true;
        }
    },
    
    // Manejar inactividad del usuario
    async handleInactivity() 
    {
        if (!sessionState.isActive) return;
        
        // Solicita confirmación al usuario
        if (window.confirm('Tu sesión está a punto de cerrarse. ¿Deseas continuar en la web?')) 
        {
            // Reinicia el monitoreo si confirma
            this.startActivityMonitoring();
        } else 
        {
            // Cierra sesión si cancela
            await prepareLogout();
        }
    },
    
    // Verificación periódica de la validez de la sesión
    startValidityChecks() 
    {
        // Limpia el intervalo existente
        clearInterval(sessionState.sessionCheckInterval);
        
        // Configura verificación periódica
        sessionState.sessionCheckInterval = setInterval(
            () => this.checkValidity(),
            SESSION_CONFIG.session.checkInterval
        );
        
        // Verificación inicial inmediata
        this.checkValidity();
    },
    
    // Verificar la validez de la sesión actual
    async checkValidity() 
    {
        if (!sessionState.isActive) return;
        
        try 
        {
            const { data, error } = await supabase.auth.getSession();
            
            // Maneja sesión inválida o expirada
            if (error || !data.session) {
                await this.handleExpiredSession();
                return;
            }
            
            // Verifica si es necesario renovar la sesión
            const expiresAt = new Date(data.session.expires_at * 1000);
            const timeRemaining = expiresAt - Date.now();
            
            if (timeRemaining < SESSION_CONFIG.session.refreshThreshold) {
                await this.refreshSession();
            }
        } catch (error) {
            console.error('Error al verificar sesión:', error);
            await this.handleSessionError(error);
        }
    },
    
    // Refrescar la sesión actual
    async refreshSession() {
        try {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) throw error;
            
            if (data?.session) {
                sessionState.isActive = true;
                await handleSuccessfulAuth(data.session.user);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error al renovar sesión:', error);
            throw error;
        }
    },
    
    // Manejar sesión expirada
    async handleExpiredSession() {
        sessionState.isActive = false;
        await prepareLogout();
        showLoginForm();
    },
    
    // Manejar errores de sesión
    async handleSessionError(error) {
        console.error('Error en la sesión:', error);
        try {
            await this.refreshSession();
        } catch {
            await this.handleExpiredSession();
            showLoginForm();
        }
    },
    
    // Limpiar todos los temporizadores
    clearTimers() {
        clearTimeout(sessionState.idleTimeout);
        clearInterval(sessionState.sessionCheckInterval);
    }
};

// Función principal que inicializa todo el sistema de autenticación al cargar la página
async function initAuth()
{
    // Obtiene la referencia al botón de inicio de sesión con Google
    const googleLoginBtn = document.getElementById('google-login-btn');
    
    // Agrega el manejador de eventos para el inicio de sesión con Google
    googleLoginBtn.addEventListener('click', handleGoogleLogin);
    
    // Inicia el sistema unificado de gestión de sesión
    sessionManager.init();
}

// Función que muestra un contenedor específico y oculta todos los demás contenedores de autenticación
function showContainer(containerId) 
{
    // Obtiene todos los contenedores con la clase 'auth-container'
    const containers = document.querySelectorAll('.auth-container');
    
    // Intenta mostrar el contenedor específico
    try 
    {
        // Oculta todos los contenedores de autenticación
        containers.forEach(container => 
        {
            // Verifica que el contenedor y su propiedad style existan antes de modificarlos
            if (container && container.style) 
            {
                // Oculta el contenedor estableciendo su display a 'none'
                container.style.display = 'none';
            }
        }); 
        
        // Busca el contenedor que se desea mostrar usando su ID recibido por parámetro
        const containerToShow = document.getElementById(containerId);
        
        // Verifica si el contenedor existe en el DOM
        if (!containerToShow) 
        {
            // Si no se encuentra el contenedor, lanza un error con el ID solicitado
            throw new Error(`No se encontró el contenedor con ID: ${containerId}`);
        }
        
        // Si el contenedor existe, lo muestra estableciendo su display a 'block'
        containerToShow.style.display = 'block';
    } 
    catch (error) 
    {
        // Intenta obtener el contenedor de inicio de sesión por defecto
        const loginContainer = document.getElementById('login-container');
        
        // Si existe el contenedor de inicio de sesión, lo muestra como fallback
        if (loginContainer) loginContainer.style.display = 'block';
    }
}

// Función que maneja la lógica después de una autenticación exitosa
async function handleSuccessfulAuth(user) 
{
    // Valida que el objeto de usuario sea válido
    if (!user || typeof user !== 'object' || !user.id) 
    {
        // Lanza un error si el objeto de usuario no es válido
        throw new Error('Objeto de usuario no válido');
    }

    // Intenta almacenar los datos del usuario en localStorage
    try 
    {
        // Verifica si localStorage está disponible en el navegador
        if (typeof localStorage === 'undefined') 
        {
            // Lanza un error si localStorage no está disponible
            throw new Error('localStorage no está disponible en este navegador');
        }

        // Prepara los datos del usuario para almacenamiento local
        const userData = 
        {
            // ID único del usuario
            id: user.id,
            
            // Email del usuario (puede estar vacío si no se proporciona)
            email: user.email || '',
            
            // Metadatos adicionales del usuario
            user_metadata: user.user_metadata ? 
            {
                // Nombre completo del usuario si está disponible
                full_name: user.user_metadata.full_name || '',
                
                // URL del avatar del usuario si está disponible
                avatar_url: user.user_metadata.avatar_url || ''
            } : {}
        };

        // Intenta guardar los datos del usuario en el almacenamiento local
        try 
        {
            // Almacena los datos del usuario como cadena JSON
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Limpia el contador de intentos fallidos
            localStorage.removeItem('failed_login_attempts');
            
            // Elimina cualquier bloqueo por exceso de intentos
            localStorage.removeItem('login_lockout_until');
        } 
        catch (storageError) 
        {
            // Si hay un error con el almacenamiento local, lo registra pero continúa
            console.error('Error al acceder a localStorage:', storageError);
        }
        
        // Muestra el contenedor de redirección
        showContainer('redirect-container');
        
        // Prepara la URL de redirección a la página principal
        const redirectUrl = new URL('index.html', window.location.origin);
        
        // Añade un parámetro de tiempo para evitar el caché del navegador
        redirectUrl.searchParams.set('auth', Date.now());
        
        // Verifica si la URL de redirección está en la lista blanca
        const isUrlAllowed = SESSION_CONFIG.security.redirectWhitelist.some(allowed => redirectUrl.pathname.endsWith(allowed));
        
        // Si la URL de redirección está en la lista blanca
        if (isUrlAllowed) 
        {
            // Intenta obtener el contenedor de redirección
            const redirectContainer = document.getElementById('redirect-container');
            
            // Si existe el contenedor de redirección, muestra una animación
            if (redirectContainer) 
            {
                // Muestra el contenedor de redirección
                showContainer('redirect-container');
                
                // Espera 1.5 segundos antes de redirigir para mostrar la animación
                setTimeout(() => 
                {
                    // Redirige a la URL de destino
                    window.location.replace(redirectUrl.toString());
                }, 1500);
            } 
            else 
            {
                // Si no hay contenedor de redirección, redirige inmediatamente
                window.location.replace(redirectUrl.toString());
            }
        } 
        else 
        {
            // Si la URL no está en la lista blanca, muestra el formulario de inicio de sesión
            showContainer('login-container');
        }
    } 
    catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Ocurrió un error al iniciar sesión. Por favor, inténtalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    }
}

// Función que muestra el formulario de inicio de sesión y oculta el indicador de carga
function showLoginForm() 
{
    // Intenta mostrar el formulario de login y ocultar el overlay de carga
    try 
    {
        // Obtiene el contenedor principal del formulario de inicio de sesión por su ID
        const loginContainer = document.getElementById('login-container');
        
        // Llama a la función que muestra el contenedor de login y oculta otros posibles contenedores
        showContainer('login-container');
        
        // Obtiene el overlay de carga (pantalla de "cargando") por su ID
        const loadingOverlay = document.getElementById('auth-loading-overlay');
        
        // Si existe el overlay y tiene propiedad style, lo oculta
        if (loadingOverlay && loadingOverlay.style) 
        {
            // Oculta el overlay de carga estableciendo su display a 'none'
            loadingOverlay.style.display = 'none';
        }
    } 
    catch (error) 
    {
        // Si ocurre un error al manipular los elementos, asegura que el body sea visible
        document.body.style.display = 'block';
    }
}

// Función que verifica el estado de autenticación del usuario
async function checkAuthentication() 
{
    return await sessionManager.verifyInitialSession();
}

// Función para preparar la interfaz para el cierre de sesión
async function prepareLogout() 
{
    // Limpia todos los temporizadores antes de cerrar sesión
    sessionManager.clearTimers();
    
    // Marca la sesión como inactiva en la UI
    sessionState = 
    {
        isActive: false,
        lastActivity: null,
        refreshTimeout: null,
        warningTimeout: null,
        idleTimeout: null,
        sessionCheckInterval: null
    };
    
    // Llama a la función principal de cierre de sesión
    return signOut();
}

// Función que maneja el proceso de inicio de sesión con Google cuando el usuario hace clic en el botón
async function handleGoogleLogin(e) 
{
    // Evita que el formulario se envíe si se llama desde un botón
    if (e) e.preventDefault();
    
    // Si ya se está procesando un inicio de sesión, sale de la función
    if (authInProgress) return;
    
    // Marca que se está procesando un inicio de sesión
    authInProgress = true;
    
    // Obtiene el botón de inicio de sesión con Google
    const googleLoginBtn = document.getElementById('google-login-btn');
    
    // Guarda el contenido original del botón para restaurarlo después
    const originalBtnContent = googleLoginBtn ? googleLoginBtn.innerHTML : '';
    
    // Intenta iniciar sesión con Google
    try 
    {
        // Si el botón existe, deshabilita el botón para evitar múltiples clicks
        if (googleLoginBtn) 
        {
            // Deshabilita el botón para evitar nuevos intentos mientras se procesa el login
            googleLoginBtn.disabled = true;
            
            // Cambia el contenido del botón para indicar que se está procesando el login
            googleLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
        }
        
        // Verifica si hay un bloqueo temporal debido a intentos fallidos
        const lockoutUntil = localStorage.getItem('login_lockout_until');
        
        // Si hay un bloqueo temporal y aún no ha expirado, muestra mensaje de espera y sale
        if (lockoutUntil && parseInt(lockoutUntil) > Date.now()) 
        {
            // Calcula los minutos que faltan para que expire el bloqueo
            const waitMinutes = Math.ceil((parseInt(lockoutUntil) - Date.now()) / 60000);
            
            // Generamos el mensaje de error
            localStorage.setItem('ErrorMessage', 'Demasiados intentos fallidos. Por favor, espera ${waitMinutes} minutos antes de intentarlo de nuevo.');
                
            // Redirigimos a la página de error
            window.location.href = 'error.html';
            
            // Sale del try para no continuar con el login
            return;
        }

        // Llama a la función de inicio de sesión con Google y obtiene el posible error
        const { error } = await signInWithGoogle();
        
        // Si ocurre un error durante el login con Google
        if (error) 
        {
            // Generamos el mensaje de error
            localStorage.setItem('ErrorMessage', 'Error al iniciar sesión. Por favor, inténtalo de nuevo.');
                
            // Redirigimos a la página de error
            window.location.href = 'error.html';
            
            // Obtiene el número de intentos fallidos almacenados en localStorage (o 0 si no existe)
            let failedAttempts = parseInt(localStorage.getItem('failed_login_attempts') || '0');
            
            // Incrementa el contador de intentos fallidos
            failedAttempts++;
            
            // Actualiza el valor en localStorage con el nuevo número de intentos
            localStorage.setItem('failed_login_attempts', failedAttempts.toString());
            
            // Si los intentos fallidos superan el máximo permitido, se bloquea el inicio de sesión temporalmente
            if (failedAttempts >= SESSION_CONFIG.security.maxFailedAttempts) 
            {
                // Calcula el tiempo hasta el que estará bloqueado el inicio de sesión (timestamp futuro)
                const lockoutUntil = Date.now() + SESSION_CONFIG.security.lockoutTime;
              
                // Guarda la marca de tiempo de desbloqueo en localStorage
                localStorage.setItem('login_lockout_until', lockoutUntil.toString());
              
                // Calcula los minutos de espera mostrando el tiempo de bloqueo al usuario
                const waitMinutes = Math.ceil(SESSION_CONFIG.security.lockoutTime / 60000);
              
                // Generamos el mensaje de error
                localStorage.setItem('ErrorMessage', 'Demasiados intentos fallidos. Por favor, espera ${waitMinutes} minutos antes de intentarlo de nuevo.');
                
                // Redirigimos a la página de error
                window.location.href = 'error.html';
            }
        }
    } 
    catch (err) 
    {
        // Si ocurre cualquier error durante el proceso de login, muestra un mensaje de error
        localStorage.setItem('ErrorMessage', 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.');
                
        // Redirigimos a la página de error
        window.location.href = 'error.html';
    } 
    finally 
    {
        // Verifica si el botón de Google existe antes de manipularlo
        if (googleLoginBtn) 
        {
            // Habilita nuevamente el botón para permitir nuevos intentos
            googleLoginBtn.disabled = false;
     
            // Restaura el contenido original del botón (ícono y texto)
            googleLoginBtn.innerHTML = originalBtnContent;
        }
        // Restablece la bandera para permitir futuros intentos de login
        authInProgress = false;
    }
}

// Comprueba el estado de carga del documento para inicializar la autenticación en el momento adecuado
if (document.readyState === 'loading') 
{
    // Si el documento aún se está cargando, espera al evento DOMContentLoaded antes de inicializar
    document.addEventListener('DOMContentLoaded', initAuth); // Se asegura que el DOM esté listo para manipulación
} 
else 
{
    // Si el documento ya está cargado, inicializa directamente
    initAuth(); // Llama a la función principal de inicialización de autenticación
}

// Exportamos las funciones que podrían ser necesarias en otros módulos
export 
{
    initAuth,
    prepareLogout,
    checkAuthentication,
    handleGoogleLogin
};
    