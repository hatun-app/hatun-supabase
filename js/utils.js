// Módulo de utilidades para la aplicación

// Importar Supabase para verificación de sesión
import { supabase } from './supabase.js';
const initApp = async () => 
{
    //
    try 
    {
        //
        await new Promise(resolve => setTimeout(resolve, 100));
        
        //
        await init();
    } catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Ocurrió un error al iniciar la web, por favor intentalo nuevamente.');
        
        // Redirigir a la página de error
        window.location.href = 'error.html';
    } 
    finally 
    {
        //
        const loadingOverlay = document.getElementById('loading-overlay');
        
        //
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
};

export const appState = 
{
    //
    user: 
    {
        //
        completedExercises: [],
        
        //
        streak: 0,
        
        //
        lastLogin: new Date().toISOString()
    },

    //
    version: '2.0.0',
    
    //
    lastUpdate: '2025-05-29',
    
    //
    currentScreen: undefined
};

//
export const navigationState = 
{
    //
    currentPage: '',
    
    //
    loadedScripts: []
};

//
export function loadSidebar() 
{
    //
    var xhr = new XMLHttpRequest();
    
    //
    xhr.open('GET', 'components/sidebar.html', true);
    
    //
    xhr.onload = function() 
    {
        //
        if (this.status === 200) 
        {
            //
            document.getElementById('sidebar-container').innerHTML = this.responseText;
            
            //
            setupSidebarNavigation();
            
            //
            setupLogoutButton();
            
            //
            updateUserAvatarInSidebar();
            
            //
            updateActiveMenuItem();
        }
    };

    //
    xhr.onerror = function() 
    {
        //
        console.error('Error al cargar el sidebar');
    };

    //
    xhr.send();
}

//
export function setupSidebarNavigation() 
{
    //
    var navLinks = document.querySelectorAll('.sidebar-nav .nav-item');
    
    //
    navLinks.forEach(function(link) 
    {
        //
        var url = link.getAttribute('href');
        
        // Para tests.html y profile.html permitimos navegación completa de página
        if (url === 'tests.html' || url === 'profile.html' || link.id === 'nav-tests') 
        {
            // No prevenimos el comportamiento por defecto, dejamos que se recargue la página
            link.addEventListener('click', function() 
            {
                // Solo actualizamos el estado de navegación
                navigationState.currentPage = url;
            });
            return;
        }
        
        //
        link.addEventListener('click', function(e) 
        {
            //
            e.preventDefault();
            
            //
            var url = this.getAttribute('href');
            
            //
            loadContent(url);
            
            //
            history.pushState(null, '', url);
            
            //
            updateActiveMenuItem();
        });
    });
}


//
export async function loadContent(url) 
{
    // 
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // 
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    
    // 
    navigationState.currentPage = url;
    
    // 
    try 
    {
        // 
        const response = await fetch(url);
        
        // 
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        
        // 
        const html = await response.text();
        
        // 
        const parser = new DOMParser();
        
        // 
        const doc = parser.parseFromString(html, 'text/html');
        
        // 
        const scripts = [];
        
        // 
        const scriptElements = doc.querySelectorAll('script');
        
        // 
        scriptElements.forEach(script => 
        {
            // 
            if (script.src) 
            {
                // 
                let src = script.src;
                
                // 
                if (src.includes('//')) 
                {
                    // 
                    const srcUrl = new URL(src);
                    
                    // 
                    const currentUrl = new URL(window.location.href);
                    
                    // 
                    if (srcUrl.host === currentUrl.host) 
                    {
                        // 
                        src = srcUrl.pathname.startsWith('/') ? srcUrl.pathname : '/' + srcUrl.pathname;
                    }
                }

                // 
                scripts.push({ 
                    // 
                    src: src, 
                    
                    // 
                    isModule: script.type === 'module' 
                });
            } else if (script.textContent.trim()) 
            {
                // 
                scripts.push({ 
                    // 
                    content: script.textContent, 
                    
                    // 
                    isModule: script.type === 'module' 
                });
            }
        });
        
        // Actualizar contenido según la página
        if (url === 'index.html' || url === '/') 
        {
            //
            const contentContainer = doc.querySelector('#app');
            
            //
            if (contentContainer) 
            {
                //
                document.querySelector('#app').innerHTML = contentContainer.innerHTML;
            }
        } else 
        {
            //
            const mainContent = doc.querySelector('.main-content');
            
            //
            if (mainContent) 
            {
                //
                document.querySelector('.main-content').innerHTML = mainContent.innerHTML;
            } else 
            {
                //
                console.error('No se encontró el contenedor principal en la página solicitada');
            }
        }
        
        // 
        const title = doc.querySelector('title');
        
        //
        if (title) document.title = title.textContent;
        
        //
        await loadScriptsSequentially(scripts);
        
        //
        updateActiveMenuItem();
    } catch (error) 
    {
        //
        console.error('Error al cargar contenido:', error);
        
        //
        showErrorMessage('Error al cargar la página. Por favor, inténtalo de nuevo.');
    } finally 
    {
        // 
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

//
export function loadScript(src, isModule = false) 
{
    //
    return new Promise((resolve, reject) => 
    {
        //
        const script = document.createElement('script');
        
        //
        script.src = src;
        
        //
        if (isModule) script.type = 'module';
        
        //
        script.onload = () => resolve();
        
        //
        script.onerror = () => reject(new Error(`Error loading script: ${src}`));
        
        //
        document.head.appendChild(script);
    });
}

// 
export function executeInlineScript(content, isModule) 
{
    //
    return new Promise((resolve, reject) => 
    {
        //
        try 
        {
            //
            if (isModule) 
            {
                //
                const blob = new Blob([content], { type: 'text/javascript' });
                
                //
                const url = URL.createObjectURL(blob);
                
                //
                import(url)
                    .then(() => {
                        URL.revokeObjectURL(url); // Liberar recursos
                        resolve();
                    })
                    .catch(error => {
                        URL.revokeObjectURL(url);
                        console.warn('Error al importar script dinámico:', error.message);
                        reject(error);
                    });
            } else 
            {
                // 
                const scriptFunction = new Function(content);
                
                // 
                scriptFunction();
                
                // 
                resolve();
            }
        } catch (error) 
        {
            // 
            console.warn('Error al ejecutar script dinámico:', error.message);
            
            // 
            reject(error);
        }
    });
}

// Reemplaza la función loadScripts recursiva con una versión async/await más limpia
async function loadScriptsSequentially(scripts) 
{
    // 
    for (const script of scripts) 
    {
        // 
        try 
        {
            // 
            if (script.src) 
            {
                // 
                await loadScript(script.src, script.isModule);
            } else if (script.content) 
            {
                // 
                await executeInlineScript(script.content, script.isModule);
            }
        } catch (error) 
        {
            // 
            console.warn('Error al cargar script:', error);
        }
    }
}

// Actualiza los elementos de avatar y nombre de usuario en el sidebar
export function updateUserAvatarInSidebar() 
{
    // 
    try 
    {
        // 
        let user = null;
        
        // 
        const userStr = localStorage.getItem('user');
        
        // 
        if (userStr) 
        {
            // 
            user = JSON.parse(userStr);
        } else 
        {
            // 
            const sessionUserStr = sessionStorage.getItem('user');
            
            // 
            if (sessionUserStr) user = JSON.parse(sessionUserStr);
        }
        
        // 
        if (user) 
        {
            //
            let displayName = user.name || user.username || 'Usuario';
            
            //
            if (user.user_metadata && user.user_metadata.full_name) 
            {
                //
                displayName = user.user_metadata.full_name;
            }
            
            // Crear iniciales a partir del nombre (máximo 2 caracteres)
            let initials = displayName.split(' ').filter(word => word.length > 0).map(word => word[0]).join('').substr(0, 2).toUpperCase();
                
            //
            if (!initials) initials = 'U';
            
            //
            const avatarInitialsElement = document.querySelector('.avatar-circle span');
            
            //
            const usernameElement = document.querySelector('.username');
            
            //
            if (avatarInitialsElement) avatarInitialsElement.textContent = initials;
            
            //
            if (usernameElement) usernameElement.textContent = displayName;
        }
    } catch (error) 
    {
        //
        console.warn('Error al actualizar avatar de usuario:', error.message);
    }
}

// Actualiza el elemento activo en el menú de navegación según la página actual
export function updateActiveMenuItem() 
{
    //
    try 
    {
        // 
        const currentPage = navigationState.currentPage || window.location.pathname.split('/').pop() || 'index.html';
                         
        // 
        const allItems = document.querySelectorAll('.sidebar-nav .nav-item');
        
        //
        allItems.forEach(item => item.classList.remove('active'));
        
        // Definir la correspondencia de páginas a IDs de menú
        const pageToMenuId = 
        {
            'index.html': 'nav-home',
            'profile.html': 'nav-dashboard', 
            'tests.html': 'nav-tests'
        };
        
        // 
        const menuId = pageToMenuId[currentPage];
        
        //
        if (menuId) 
        {
            //
            const menuItem = document.getElementById(menuId);
            
            //
            if (menuItem) 
            {
                //
                menuItem.classList.add('active');
            }
        }
    } catch (error) 
    {
        //
        console.warn('Error al actualizar elemento activo del menú:', error.message);
    }
}

//
export function setupLogoutButton() 
{
    //
    var logoutButton = document.getElementById('logout-button');
    
    //
    if (logoutButton) 
    {
        //
        logoutButton.addEventListener('click', async function(e) 
        {
            //
            e.preventDefault();
            
            //
            try 
            {
                //
                const { signOut } = await import('./supabase.js');
                
                //
                const result = await signOut();
                
                //
                if (result && result.error) 
                {
                    //
                    alert('Error al cerrar sesión: ' + result.error);
                    
                    //
                    return;
                }

                //
                localStorage.removeItem('user');
                
                //
                window.location.href = 'index.html';
            } catch 
            {
                //
                alert('Error inesperado al cerrar sesión');
            }
        });
    }
}

//
window.loadContent = loadContent;

//
async function init() 
{
    //
    try 
    {
        //
        appState.securityInitialized = true;
        
        //
        setupNavigationEvents();
        
        //
        const isAuthenticated = await checkAuth();
        
        //
        if (isAuthenticated) 
        {
            //
            if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) 
            {
                //
                await showScreen('course-selection');
                
                //
                if (typeof initCoursesPage === 'function') await initCoursesPage();
            }
        }

        //
        return true;
    } catch (error) 
    {
        // Generamos el mensaje de error
        localStorage.setItem('ErrorMessage', 'Ha ocurrido un error al iniciar la página. Por favor intenta de nuevo.');
        
        // Redirigir a la página de error
        window.location.href = 'error.html';
    }
}

//
export async function showScreen(screenId) 
{
    return new Promise((resolve) => 
    {    
        //
        const sanitizedScreenId = screenId.replace(/[^a-zA-Z0-9_-]/g, '');
        
        //
        const screens = document.querySelectorAll('.screen');
        
        //
        let found = false;
        
        //
        screens.forEach(screen => 
        {
            //
            if (screen.id === sanitizedScreenId) 
            {
                //
                screen.style.display = 'block';
                
                //
                found = true;
                
                //
                setTimeout(() => 
                {
                    //
                    const event = new CustomEvent('screenShown', { detail: { screenId: sanitizedScreenId } });
                    
                    //
                    document.dispatchEvent(event);
                    
                    //
                    resolve(true);
                }, 100);
            } else 
            {
                //
                screen.style.display = 'none';
            }
        });

        //
        if (found) 
        {
            //
            appState.currentScreen = sanitizedScreenId;
        } else 
        {
            //
            resolve(false);
        }
    });
}

// 
export function setupNavigationEvents() 
{
    // 
    const backToCoursesBtn = document.getElementById('back-to-courses');
    
    // 
    if (backToCoursesBtn) 
    {
        // 
        backToCoursesBtn.addEventListener('click', (e) => 
        {
            // 
            e.preventDefault();
            
            // 
            showScreen('course-selection');
        });
    }
    
    // 
    const profileButton = document.getElementById('profile-button');
    
    // 
    if (profileButton) 
    {
        // 
        profileButton.addEventListener('click', function() 
        {
            // 
            window.location.href = 'profile.html';
        });
    }

    // 
    const backFromProfileBtn = document.getElementById('back-from-profile');
    
    // 
    if (backFromProfileBtn) 
    {
        // 
        backFromProfileBtn.addEventListener('click', () => showScreen('course-selection'));
    }

    // 
    const logoutButton = document.getElementById('logout-button');
    
    // 
    if (logoutButton) 
    {
        //
        logoutButton.addEventListener('click', async () => 
        {
            //
            const { signOut } = await import('./supabase.js');
                
            //
            await signOut();

            //
            localStorage.removeItem('user');
            
            //
            sessionStorage.removeItem('user');
            
            //
            document.cookie.split(';').forEach(cookie => 
            {
                //
                const [name] = cookie.trim().split('=');
                
                //
                if (name && name.includes('sb-') || name.includes('auth')) 
                {
                    //
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                }
            });

            //
            window.location.href = 'login.html';
        });
    }
}

// Función para verificar autenticación usando Supabase session
export async function checkAuth() 
{
    try {
        // Verificar la sesión actual en Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Si hay error al obtener la sesión
        if (error) {
            console.error('Error al verificar sesión:', error);
            // Limpiar localStorage si hay error de sesión
            localStorage.removeItem('user');
            return false;
        }
        
        // Verificar si hay una sesión válida
        if (!session || !session.user) {
            // No hay sesión válida, limpiar localStorage
            localStorage.removeItem('user');
            
            // Verificar si estamos en la página de login
            const currentPath = window.location.pathname;
            const loginPath = '/login.html';
            
            if (!currentPath.endsWith(loginPath)) {
                // Redirigir al login si no estamos ya ahí
                window.location.href = loginPath;
                return false;
            }
            return false;
        }
        
        // Sesión válida - actualizar localStorage con datos actuales
        const userData = {
            id: session.user.id,
            email: session.user.email || '',
            user_metadata: session.user.user_metadata || {}
        };
        localStorage.setItem('user', JSON.stringify(userData));
        
        return true;
    } catch (error) {
        console.error('Error en checkAuth:', error);
        // En caso de error, limpiar localStorage y redirigir al login
        localStorage.removeItem('user');
        
        const currentPath = window.location.pathname;
        const loginPath = '/login.html';
        
        if (!currentPath.endsWith(loginPath)) {
            window.location.href = loginPath;
        }
        return false;
    }
}

if (document.readyState === 'loading') 
{
    //
    document.addEventListener('DOMContentLoaded', initApp);
} else 
{
    //
    initApp();
}

//
export 
{
    initApp,
    init,
};
