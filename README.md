# Hatun - Plataforma Educativa

![Hatun Logo](img/hatun-logo.png)

## Descripción del proyecto

Hatun es una plataforma educativa interactiva diseñada para facilitar el aprendizaje con estadísticas personalizadas, insignias de progreso y un sistema de seguimiento de avance. La plataforma ofrece material teórico y práctico con diferentes modos de estudio para adaptarse a las necesidades del usuario.

## Características principales

- **Autenticación con Google**: Acceso seguro utilizando cuentas de Google OAuth
- **Panel de perfil personalizado**: Estadísticas de aprendizaje, gráficos de progreso e insignias
- **Contenido educativo estructurado**: Cursos organizados por temas, con material teórico y ejercicios prácticos
- **Sistema de logros**: Insignias que se desbloquean a medida que el usuario completa exámenes
- **Seguimiento de progreso**: Estadísticas detalladas por mes, visualización de tiempo de estudio
- **Múltiples modos de aprendizaje**: Teoría, práctica y evaluación

## Tecnologías utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Gráficos**: Chart.js para visualización de datos
- **Backend**: Supabase (PostgreSQL + API REST)
- **Autenticación**: Supabase Auth con OAuth de Google
- **Iconos**: Font Awesome 5
- **Tipografía**: Google Fonts (Roboto)

## Estructura del proyecto

```
hatun-supabase/
├── components/        # Componentes reutilizables de la interfaz
├── css/               # Estilos de la aplicación
├── img/               # Imágenes e íconos
│   └── icons/         # Iconos de la interfaz
├── js/                # Scripts de JavaScript
│   ├── login.js       # Autenticación y gestión de usuarios
│   ├── courses.js     # Gestión de cursos disponibles
│   ├── topics.js      # Gestión de temas disponibles
│   ├── modes.js       # Modos de estudio disponibles
│   ├── theory.js      # Manejo de contenido teórico
│   ├── learning.js    # Funcionalidad del módulo de aprendizaje
│   ├── practice.js    # Funcionalidad del modo práctica
│   ├── profile.js     # Gestión del perfil y estadísticas del usuario
│   ├── tests.js       # Funcionalidades del historial de exámenes
│   ├── supabase.js    # Conexión y operaciones con Supabase
│   └── utils.js       # Utilidades generales y funciones compartidas
└── *.html             # Páginas de la aplicación
```

## Páginas principales

- **login.html**: Autenticación de usuarios
- **index.html**: Listado de cursos disponibles
- **topics.html**: Listado de temas disponibles
- **modes.html**: Selección de modos de estudio
- **theory.html**: Contenido teórico de un tema
- **learning.html**: Modo de aprendizaje sin límite de tiempo
- **practice.html**: Modo práctica con temporizador
- **profile.html**: Panel de control y estadísticas del usuario
- **tests.html**: Historial de exámenes

## Uso de Supabase

El proyecto utiliza Supabase como backend. La configuración se encuentra en el archivo `js/supabase.js`.
