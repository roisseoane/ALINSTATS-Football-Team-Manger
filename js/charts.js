import { getState } from './state.js';
import { calcularMvpFlow } from './ui.js';

let chartRendimiento = null;
let chartRadar = null;

export function mostrarGraficasJugador(jugadorId) {
    const { partidos, partitSeleccionat, plantilla } = getState();
    const ctxRend = document.getElementById('chart-rendimiento').getContext('2d');
    const ctxRadar = document.getElementById('chart-mvp').getContext('2d');

    // Actualizar título
    const tituloAnalisis = document.querySelector('#analisi-rendiment h2');
    if (tituloAnalisis) {
        tituloAnalisis.textContent = `Anàlisi de rendiment de ${plantilla.find(j => j.id === jugadorId)?.nombreMostrado || ''}`;
    }

    // Limpiar gráficos anteriores
    if (chartRendimiento) chartRendimiento.destroy();
    if (chartRadar) chartRadar.destroy();    // Datos de rendimiento por partido
    const partidosJugador = partidos.map(p => {
        const stats = p.estadistiques?.[jugadorId] || {};
        return {
            partido: p.nom,
            mvp: calcularMvpFlow(stats),
            stats: stats
        };
    }).sort((a, b) => partidos.findIndex(p => p.nom === a.partido) - partidos.findIndex(p => p.nom === b.partido));

    const mvpData = partidosJugador.map(p => p.mvp);
    const mediaMovil = mvpData.map((val, idx, arr) => {
        const start = Math.max(0, idx - 2);
        const end = idx + 1;
        const slice = arr.slice(start, end);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
    });

    chartRendimiento = new Chart(ctxRend, {
        type: 'line',
        data: {
            labels: partidosJugador.map(p => p.partido),
            datasets: [{
                label: 'MVP Flow',
                data: mvpData,
                borderColor: '#00aaff',
                backgroundColor: 'rgba(0,170,255,0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#00aaff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 8
            }, {
                label: 'Tendència (últims 3 partits)',
                data: mediaMovil,
                borderColor: '#ff9900',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                borderDash: [5, 5],
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#fff',
                        font: { size: 12 },
                        usePointStyle: true,
                        padding: 20
                    }
                },
                title: {
                    display: true,
                    text: 'Evolució MVP Flow',
                    color: '#fff',
                    font: { size: 16, weight: 'bold' },
                    padding: { bottom: 20 }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    padding: 12,
                    usePointStyle: true,
                    callbacks: {
                        afterBody: function(context) {
                            const idx = context[0].dataIndex;
                            const stats = partidosJugador[idx].stats;
                            return [
                                '',
                                `Gols: ${stats.goles || 0}`,
                                `Assistències: ${stats.asistencias || 0}`,
                                `Xuts: ${stats.chutes || 0}`,
                                `Recuperacions: ${stats.recuperaciones || 0}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    ticks: {
                        color: '#aaa',
                        font: { size: 12 },
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.1)',
                        drawTicks: false
                    },
                    border: { dash: [2, 4] }
                },
                x: {
                    ticks: {
                        color: '#aaa',
                        font: { size: 12 },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.1)',
                        drawTicks: false
                    },
                    border: { dash: [2, 4] }
                }
            }
        }
    });

    // Datos radar del partido seleccionado
    let stats = {};
    let mediaEquipo = {
        goles: 0,
        asistencias: 0,
        chutes: 0,
        perdidas: 0,
        recuperaciones: 0
    };

    if (partitSeleccionat === 'global') {
        // Sumar todos los partidos del jugador
        stats = partidos.reduce((acc, p) => {
            const s = p.estadistiques?.[jugadorId] || {};
            acc.goles += s.goles || 0;
            acc.asistencias += s.asistencias || 0;
            acc.chutes += s.chutes || 0;
            acc.perdidas += s.perdidas || 0;
            acc.recuperaciones += s.recuperaciones || 0;
            return acc;
        }, {goles:0, asistencias:0, chutes:0, perdidas:0, recuperaciones:0});

        // Calcular media del equipo
        let totalJugadores = plantilla.length;
        plantilla.forEach(jugador => {
            let statsJugador = partidos.reduce((acc, p) => {
                const s = p.estadistiques?.[jugador.id] || {};
                acc.goles += s.goles || 0;
                acc.asistencias += s.asistencias || 0;
                acc.chutes += s.chutes || 0;
                acc.perdidas += s.perdidas || 0;
                acc.recuperaciones += s.recuperaciones || 0;
                return acc;
            }, {goles:0, asistencias:0, chutes:0, perdidas:0, recuperaciones:0});

            mediaEquipo.goles += statsJugador.goles;
            mediaEquipo.asistencias += statsJugador.asistencias;
            mediaEquipo.chutes += statsJugador.chutes;
            mediaEquipo.perdidas += statsJugador.perdidas;
            mediaEquipo.recuperaciones += statsJugador.recuperaciones;
        });

        // Calcular medias
        Object.keys(mediaEquipo).forEach(key => {
            mediaEquipo[key] = mediaEquipo[key] / totalJugadores;
        });
    } else {
        const p = partidos.find(p => p.id == partitSeleccionat);
        stats = p?.estadistiques?.[jugadorId] || {goles:0, asistencias:0, chutes:0, perdidas:0, recuperaciones:0};

        // Calcular media del equipo para el partido seleccionado
        let totalJugadores = plantilla.length;
        plantilla.forEach(jugador => {
            const s = p?.estadistiques?.[jugador.id] || {};
            mediaEquipo.goles += s.goles || 0;
            mediaEquipo.asistencias += s.asistencias || 0;
            mediaEquipo.chutes += s.chutes || 0;
            mediaEquipo.perdidas += s.perdidas || 0;
            mediaEquipo.recuperaciones += s.recuperaciones || 0;
        });

        Object.keys(mediaEquipo).forEach(key => {
            mediaEquipo[key] = mediaEquipo[key] / totalJugadores;
        });
    }

    // Calcular valores máximos para normalización
    const maxValues = {
        goles: Math.max(3, stats.goles || 0, mediaEquipo.goles),
        asistencias: Math.max(3, stats.asistencias || 0, mediaEquipo.asistencias),
        chutes: Math.max(6, stats.chutes || 0, mediaEquipo.chutes),
        perdidas: Math.max(6, stats.perdidas || 0, mediaEquipo.perdidas),
        recuperaciones: Math.max(6, stats.recuperaciones || 0, mediaEquipo.recuperaciones)
    };

    // Normalizar valores a escala 0-10
    const normalizedData = {
        goles: (stats.goles || 0) * (10 / maxValues.goles),
        asistencias: (stats.asistencias || 0) * (10 / maxValues.asistencias),
        chutes: (stats.chutes || 0) * (10 / maxValues.chutes),
        perdidas: (stats.perdidas || 0) * (10 / maxValues.perdidas),
        recuperaciones: (stats.recuperaciones || 0) * (10 / maxValues.recuperaciones)
    };

    const normalizedMedia = {
        goles: mediaEquipo.goles * (10 / maxValues.goles),
        asistencias: mediaEquipo.asistencias * (10 / maxValues.asistencias),
        chutes: mediaEquipo.chutes * (10 / maxValues.chutes),
        perdidas: mediaEquipo.perdidas * (10 / maxValues.perdidas),
        recuperaciones: mediaEquipo.recuperaciones * (10 / maxValues.recuperaciones)
    };

    chartRadar = new Chart(ctxRadar, {
        type: 'radar',
        data: {
            labels: ['Gols', 'Assistències', 'Xuts', 'Pèrdues', 'Recuperacions'],
            datasets: [{
                label: 'Jugador',
                data: [
                    normalizedData.goles,
                    normalizedData.asistencias,
                    normalizedData.chutes,
                    normalizedData.perdidas,
                    normalizedData.recuperaciones
                ],
                borderColor: '#00aaff',
                backgroundColor: 'rgba(0,170,255,0.2)',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#00aaff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }, {
                label: 'Mitjana equip',
                data: [
                    normalizedMedia.goles,
                    normalizedMedia.asistencias,
                    normalizedMedia.chutes,
                    normalizedMedia.perdidas,
                    normalizedMedia.recuperaciones
                ],
                borderColor: '#ff9900',
                backgroundColor: 'rgba(255,153,0,0.2)',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#ff9900',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderDash: [5, 5]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#fff',
                        font: { size: 12 },
                        usePointStyle: true,
                        padding: 20
                    }
                },
                title: {
                    display: true,
                    text: partitSeleccionat === 'global' ? 'Rendiment Global' : 'Rendiment del Partit',
                    color: '#fff',
                    font: { size: 16, weight: 'bold' },
                    padding: { bottom: 20 }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const originalValue = context.datasetIndex === 0 ?
                                stats[['goles', 'asistencias', 'chutes', 'perdidas', 'recuperaciones'][context.dataIndex]] || 0 :
                                mediaEquipo[['goles', 'asistencias', 'chutes', 'perdidas', 'recuperaciones'][context.dataIndex]];
                            return ` ${context.dataset.label}: ${originalValue.toFixed(1)} (${value.toFixed(1)}/10)`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    min: 0,
                    max: 10,
                    ticks: {
                        stepSize: 2,
                        color: '#aaa',
                        font: { size: 10 },
                        backdropColor: 'rgba(0,0,0,0.3)'
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.1)',
                        circular: true
                    },
                    angleLines: {
                        color: 'rgba(255,255,255,0.15)',
                        lineWidth: 1
                    },
                    pointLabels: {
                        color: '#fff',
                        font: { size: 14, weight: 'bold' }
                    }
                }
            },
            elements: {
                line: {
                    borderWidth: 2
                }
            }
        }
    });
}
