// Datos de estadísticas de jugadores
const estadisticasJugadores = {
    "1": [], "2": [], "3": [], "4": [], 
    "5": [], "6": [], "7": [], "8": [], 
    "9": [], "10": []
};
/*
const estadisticasJugadores = {
    "1": [], "2": [], "3": [], "4": [], 
    "5": [], "6": [], "7": [], "8": [], 
    "9": [], "10": []
};
*/


// Datos de la plantilla
const plantilla = [
    { id: 1, nombreMostrado: 'DON' },
    { id: 2, nombreMostrado: 'MEDINA' },
    { id: 3, nombreMostrado: 'LLUC' },
    { id: 4, nombreMostrado: 'ARON' },
    { id: 5, nombreMostrado: 'JORDI' },
    { id: 6, nombreMostrado: 'LOPA' },
    { id: 7, nombreMostrado: 'MIRÓ' },
    { id: 8, nombreMostrado: 'ARNAU' },
    { id: 9, nombreMostrado: 'MARC' },
    { id: 10, nombreMostrado: '400'}
];

// Configuración de posiciones y habilidades
const habilidadPorPosicion = {
    portero: [2,5],
    cierre: [7,1,6],
    alaIzquierdo: [8,3,6,5],
    alaDerecho: [6,10,8,5],
    pivot: [9,4,5,8,2]
};

const inicialesPosicion = {
    portero: 'POR',
    cierre: 'CIE',
    alaIzquierdo: 'AE',
    alaDerecho: 'AD',
    pivot: 'PIV'
};

const coordenadasPosiciones = {
    portero: {top: '112%', left: '50%'},
    cierre: {top: '75%', left: '50%'},
    alaIzquierdo: {top: '45%', left: '30%'},
    alaDerecho: {top: '45%', left: '70%'},
    pivot: {top: '25%', left: '50%'}
};
