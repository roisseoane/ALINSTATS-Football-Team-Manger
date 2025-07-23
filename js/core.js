// js/core.js

export function generarMejorAlineacion(jugadoresDisponibles, habilidadPorPosicion) {
    const alineacion = {
        portero: { titular: null, suplentes: [] },
        cierre: { titular: null, suplentes: [] },
        alaIzquierdo: { titular: null, suplentes: [] },
        alaDerecho: { titular: null, suplentes: [] },
        pivot: { titular: null, suplentes: [] }
    };

    let jugadoresPorAsignar = [...jugadoresDisponibles];

    // Assign starters
    for (const pos in habilidadPorPosicion) {
        for (const id of habilidadPorPosicion[pos]) {
            if (jugadoresPorAsignar.includes(id)) {
                alineacion[pos].titular = id;
                jugadoresPorAsignar = jugadoresPorAsignar.filter(x => x !== id);
                break;
            }
        }
    }

    // Assign substitutes
    let restantes = [...jugadoresPorAsignar];
    while (restantes.length > 0) {
        let mejor = { jugadorId: null, posicion: null, ranking: Infinity };
        for (const id of restantes) {
            for (const pos in habilidadPorPosicion) {
                if (!alineacion[pos].titular) continue;
                const rank = habilidadPorPosicion[pos].indexOf(id);
                if (rank !== -1 && rank < mejor.ranking && !Object.values(alineacion).some(p => p.suplentes.includes(id))) {
                    mejor = { jugadorId: id, posicion: pos, ranking: rank };
                }
            }
        }
        if (mejor.jugadorId) {
            alineacion[mejor.posicion].suplentes.push(mejor.jugadorId);
            restantes = restantes.filter(x => x !== mejor.jugadorId);
        } else {
            break;
        }
    }

    return alineacion;
}
