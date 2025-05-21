// Configuración de la API de The Movie Database
const API_KEY = 'API KEY '; // Reemplaza con tu API key de TMDB
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
const POSTER_SIZE = 'w500';
const BACKDROP_SIZE = 'original';
const DEFAULT_LANGUAGE = 'es-ES';

// Elementos del DOM
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const movieResults = document.getElementById('movieResults');
const loadingIndicator = document.getElementById('loadingIndicator');
const noResults = document.getElementById('noResults');
const movieModal = document.getElementById('movieModal');
const movieModalContent = document.getElementById('movieModalContent');
const closeModal = document.getElementById('closeModal');

// Variable para controlar el tiempo entre búsquedas
let searchTimeout = null;
// Variable para controlar las solicitudes de búsqueda actuales
let currentSearchController = null;

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Mostrar películas populares al cargar la página
    fetchPopularMovies();
    
    // Event listener para el botón de búsqueda
    searchButton.addEventListener('click', handleSearch);
    
    // Event listener para buscar mientras se escribe
    searchInput.addEventListener('input', () => {
        // Limpiar el timeout anterior si existe
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Configurar un nuevo timeout para evitar múltiples solicitudes
        searchTimeout = setTimeout(() => {
            const query = searchInput.value.trim();
            
            if (query.length >= 2) {
                // Solo buscar si hay al menos 2 caracteres
                searchMovies(query);
            } else if (query.length === 0) {
                // Si se borra la búsqueda, mostrar películas populares
                fetchPopularMovies();
            }
        }, 500); // Esperar 500ms después de que el usuario deje de escribir
    });
    
    // Event listener para buscar al presionar Enter
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            // Cancelar cualquier búsqueda pendiente
            if (searchTimeout) {
                clearTimeout(searchTimeout);
                searchTimeout = null;
            }
            handleSearch();
        }
    });
    
    // Event listener para cerrar el modal
    closeModal.addEventListener('click', () => {
        movieModal.classList.add('hidden');
    });
    
    // Cerrar modal al hacer clic fuera del contenido
    movieModal.addEventListener('click', (e) => {
        if (e.target === movieModal) {
            movieModal.classList.add('hidden');
        }
    });
});

// Función para manejar la búsqueda
function handleSearch() {
    const query = searchInput.value.trim();
    
    if (query.length === 0) {
        // Si la búsqueda está vacía, mostrar películas populares
        fetchPopularMovies();
        return;
    }
    
    if (query.length < 2) {
        // Evitar búsquedas con un solo carácter
        return;
    }
    
    searchMovies(query);
}

// Función para buscar películas
async function searchMovies(query) {
    // Cancelar búsqueda anterior si existe
    if (currentSearchController) {
        currentSearchController.abort();
    }
    
    // Crear nuevo controlador para esta búsqueda
    currentSearchController = new AbortController();
    const signal = currentSearchController.signal;
    
    // Mostrar un pequeño indicador de "buscando..." encima de los resultados actuales
    if (!loadingIndicator.classList.contains('hidden')) {
        const searchingIndicator = document.createElement('div');
        searchingIndicator.id = 'searchingIndicator';
        searchingIndicator.className = 'col-span-full text-center py-2 text-amber-500 searching-indicator';
        searchingIndicator.textContent = 'Buscando...';
        
        // Solo añadir si no existe ya
        if (!document.getElementById('searchingIndicator')) {
            if (movieResults.firstChild) {
                movieResults.insertBefore(searchingIndicator, movieResults.firstChild);
            } else {
                movieResults.appendChild(searchingIndicator);
            }
        }
    } else {
        showLoading();
    }
    
    try {
        const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&language=${DEFAULT_LANGUAGE}&query=${encodeURIComponent(query)}&include_adult=false`;
        const response = await fetch(url, { signal });
        const data = await response.json();
        
        // Solo mostrar resultados si esta búsqueda no ha sido cancelada
        if (!signal.aborted) {
            displayMovies(data.results);
        }
    } catch (error) {
        // Ignorar errores de búsqueda abortada
        if (error.name === 'AbortError') {
            console.log('Búsqueda anterior cancelada');
            return;
        }
        
        console.error('Error al buscar películas:', error);
        hideLoading();
        showNoResults();
    } finally {
        // Limpiar el controlador actual si esta búsqueda completó o falló (pero no fue abortada)
        if (currentSearchController && currentSearchController.signal.aborted === false) {
            currentSearchController = null;
        }
    }
}

// Función para obtener películas populares
async function fetchPopularMovies() {
    showLoading();
    
    try {
        const url = `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=${DEFAULT_LANGUAGE}&page=1`;
        const response = await fetch(url);
        const data = await response.json();
        
        displayMovies(data.results);
    } catch (error) {
        console.error('Error al obtener películas populares:', error);
        hideLoading();
        showNoResults();
    }
}

// Función para mostrar las películas en la interfaz
function displayMovies(movies) {
    hideLoading();
    
    if (!movies || movies.length === 0) {
        showNoResults();
        return;
    }
    
    noResults.classList.add('hidden');
    movieResults.innerHTML = '';
    
    // Si es resultado de búsqueda, mostrar mensaje informativo
    if (searchInput.value.trim().length > 0) {
        const resultsHeading = document.createElement('div');
        resultsHeading.className = 'col-span-full mb-4 text-gray-400';
        resultsHeading.innerHTML = `<p>Resultados para "${searchInput.value.trim()}"</p>`;
        movieResults.appendChild(resultsHeading);
    }
    
    movies.forEach((movie, index) => {
        // Crear tarjeta de película
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card bg-gray-800 rounded-lg overflow-hidden shadow-lg cursor-pointer relative';
        movieCard.style.animationDelay = `${index * 0.05}s`;
        
        // Añadir contenido HTML a la tarjeta
        const posterPath = movie.poster_path 
            ? `${IMAGE_BASE_URL}${POSTER_SIZE}${movie.poster_path}`
            : null;
        
        movieCard.innerHTML = `
            ${posterPath 
                ? `<img src="${posterPath}" alt="${movie.title}" class="w-full h-64 object-cover">`
                : `<div class="w-full h-64 no-poster">Sin póster disponible</div>`
            }
            <div class="p-4">
                <h3 class="text-lg font-semibold truncate">${movie.title}</h3>
                <p class="text-sm text-gray-400">${movie.release_date ? new Date(movie.release_date).getFullYear() : 'Año desconocido'}</p>
            </div>
            ${movie.vote_average ? `
                <div class="rating-badge ${getRatingColorClass(movie.vote_average)}">
                    ${movie.vote_average.toFixed(1)}
                </div>
            ` : ''}
        `;
        
        // Event listener para mostrar detalles al hacer clic
        movieCard.addEventListener('click', () => {
            fetchMovieDetails(movie.id);
        });
        
        movieResults.appendChild(movieCard);
    });
}

// Función para obtener detalles de una película
async function fetchMovieDetails(movieId) {
    showLoading();
    
    try {
        const url = `${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=${DEFAULT_LANGUAGE}&append_to_response=credits,videos`;
        const response = await fetch(url);
        const movie = await response.json();
        
        displayMovieDetails(movie);
    } catch (error) {
        console.error('Error al obtener detalles de la película:', error);
        hideLoading();
    }
}

// Función para mostrar los detalles de una película en el modal
function displayMovieDetails(movie) {
    hideLoading();
    
    const backdropPath = movie.backdrop_path 
        ? `${IMAGE_BASE_URL}${BACKDROP_SIZE}${movie.backdrop_path}`
        : (movie.poster_path ? `${IMAGE_BASE_URL}${BACKDROP_SIZE}${movie.poster_path}` : null);
    
    const directors = movie.credits?.crew?.filter(person => person.job === 'Director') || [];
    const cast = movie.credits?.cast?.slice(0, 5) || [];
    
    // Trailer de YouTube (si está disponible)
    const trailer = movie.videos?.results?.find(video => 
        video.site === 'YouTube' && 
        (video.type === 'Trailer' || video.type === 'Teaser')
    );
    
    movieModalContent.innerHTML = `
        <div class="modal-content">
            ${backdropPath ? `
                <div class="relative w-full h-64 bg-gray-900 mb-6 overflow-hidden">
                    <img src="${backdropPath}" alt="${movie.title}" class="w-full h-full object-cover opacity-50">
                    <div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-900">
                        <h2 class="text-3xl font-bold">${movie.title}</h2>
                        ${movie.tagline ? `<p class="text-amber-400 mt-2 italic">${movie.tagline}</p>` : ''}
                    </div>
                </div>
            ` : `
                <h2 class="text-3xl font-bold mb-6">${movie.title}</h2>
                ${movie.tagline ? `<p class="text-amber-400 mb-6 italic">${movie.tagline}</p>` : ''}
            `}
            
            <div class="mb-6 flex flex-wrap gap-2">
                ${movie.genres?.map(genre => 
                    `<span class="px-3 py-1 bg-gray-700 rounded-full text-sm">${genre.name}</span>`
                ).join('') || ''}
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <h3 class="text-xl font-semibold mb-3 text-amber-500">Información</h3>
                    <div class="space-y-2">
                        <p><span class="text-gray-400">Fecha de estreno:</span> ${formatDate(movie.release_date)}</p>
                        <p><span class="text-gray-400">Duración:</span> ${formatRuntime(movie.runtime)}</p>
                        <p><span class="text-gray-400">Calificación:</span> ${movie.vote_average ? `${movie.vote_average.toFixed(1)}/10 (${movie.vote_count} votos)` : 'No disponible'}</p>
                        ${directors.length > 0 ? `
                            <p><span class="text-gray-400">Director:</span> ${directors.map(d => d.name).join(', ')}</p>
                        ` : ''}
                    </div>
                </div>
                
                <div>
                    <h3 class="text-xl font-semibold mb-3 text-amber-500">Reparto principal</h3>
                    ${cast.length > 0 ? `
                        <div class="space-y-1">
                            ${cast.map(actor => `
                                <p>${actor.name} <span class="text-gray-400">como ${actor.character}</span></p>
                            `).join('')}
                        </div>
                    ` : '<p>Información de reparto no disponible</p>'}
                </div>
            </div>
            
            <div class="mb-6">
                <h3 class="text-xl font-semibold mb-3 text-amber-500">Sinopsis</h3>
                <p class="text-gray-300">${movie.overview || 'No hay sinopsis disponible para esta película.'}</p>
            </div>
            
            ${trailer ? `
                <div class="mb-6">
                    <h3 class="text-xl font-semibold mb-3 text-amber-500">Trailer</h3>
                    <div class="aspect-w-16 aspect-h-9">
                        <iframe 
                            class="w-full h-64"
                            src="https://www.youtube.com/embed/${trailer.key}" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                        </iframe>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    movieModal.classList.remove('hidden');
}

// Funciones auxiliares
function showLoading() {
    loadingIndicator.classList.remove('hidden');
    noResults.classList.add('hidden');
}

function hideLoading() {
    loadingIndicator.classList.add('hidden');
}

function showNoResults() {
    noResults.classList.remove('hidden');
    movieResults.innerHTML = '';
}

function getRatingColorClass(rating) {
    if (rating >= 7.5) return 'bg-green-500';
    if (rating >= 6) return 'bg-amber-500';
    if (rating >= 4) return 'bg-orange-500';
    return 'bg-red-500';
}

function formatDate(dateString) {
    if (!dateString) return 'Fecha desconocida';
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

function formatRuntime(minutes) {
    if (!minutes) return 'Duración desconocida';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins} minutos`;
    if (mins === 0) return `${hours} horas`;
    
    return `${hours}h ${mins}min`;
}
