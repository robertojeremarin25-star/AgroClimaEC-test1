// ================= NAVEGACIÓN =================
document.getElementById("startBtn")?.addEventListener("click", () => {
    window.location.href = "cultivo.html";
});

document.getElementById("continueBtn")?.addEventListener("click", () => {
    window.location.href = "ubicacion.html";
});

// ================= TIPO DE SIEMBRA =================
let tipoSiembra = "";

document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
        document.querySelectorAll(".card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        tipoSiembra = card.dataset.tipo;
    });
});

document.getElementById("nextBtn")?.addEventListener("click", () => {
    const provincia = document.getElementById("provincia")?.value;
    const canton = document.getElementById("canton")?.value;

    if (!provincia || !canton || !tipoSiembra) {
        alert("Completa todos los campos");
        return;
    }

    localStorage.setItem("provincia", provincia);
    localStorage.setItem("canton", canton);
    localStorage.setItem("tipoSiembra", tipoSiembra);

    window.location.href = "etapa.html";
});

// ================= ETAPA =================
let etapaSeleccionada = "";

document.querySelectorAll("[data-etapa]").forEach(card => {
    card.addEventListener("click", () => {
        document.querySelectorAll("[data-etapa]").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        etapaSeleccionada = card.dataset.etapa;
    });
});

document.getElementById("analyzeBtn")?.addEventListener("click", () => {
    if (!etapaSeleccionada) {
        alert("Selecciona la etapa del cultivo");
        return;
    }

    localStorage.setItem("etapa", etapaSeleccionada);
    window.location.href = "resultado.html";
});

// ================= RESULTADO =================
if (window.location.pathname.includes("resultado.html")) {

    const provincia = localStorage.getItem("provincia");
    const canton = localStorage.getItem("canton");
    const tipo = localStorage.getItem("tipoSiembra");
    const etapa = localStorage.getItem("etapa");

    document.getElementById("provincia").textContent = provincia || "--";
    document.getElementById("canton").textContent = canton || "--";
    document.getElementById("tipoSiembra").textContent = tipo || "--";
    document.getElementById("etapa").textContent = etapa || "--";

    // ===== API CLIMA =====
    async function obtenerClima(ciudad) {
        const apiKey = "38a12ac7a467a778fab26540244bfde6";
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${ciudad},EC&appid=${apiKey}&units=metric`;

        try {
            const resp = await fetch(url);
            const data = await resp.json();

            return {
                temperatura: data.main.temp,
                humedad: data.main.humidity,
                lluvia: traducirLluvia(data.weather[0].main)
            };
        } catch (e) {
            console.error("Error clima:", e);
            return null;
        }
    }

    function traducirLluvia(main) {
        if (main === "Rain" || main === "Thunderstorm") return "alta";
        if (main === "Clouds") return "media";
        return "baja";
    }

    // ===== ANÁLISIS AGRONÓMICO =====
    function analizarClima(clima, etapa, tipo) {

        let estado = "verde";
        let alertas = [];
        let recomendaciones = [];
        let razones = [];

        const t = clima.temperatura;
        const h = clima.humedad;
        const l = clima.lluvia;

        // GERMINACIÓN
        if (etapa === "germinacion") {
            if (t < 18) {
                estado = "rojo";
                alertas.push("Temperatura muy baja para germinación");
                recomendaciones.push("Esperar mejores condiciones térmicas");
                razones.push(`Temperatura crítica: ${t}°C`);

            } else if (t < 20) {
                estado = "amarillo";
                alertas.push("Temperatura límite para germinación");
            }

            if (h < 60) {
                estado = "amarillo";
                alertas.push("Humedad insuficiente");
                recomendaciones.push("Mantener suelo húmedo");
                razones.push(`Humedad baja: ${h}%`);

            }
        }

        // MACOLLAMIENTO
        if (etapa === "macollamiento") {
            if (t > 34) {
                estado = "amarillo";
                alertas.push("Estrés térmico en macollamiento");
            }

            if (tipo === "secano" && l === "baja") {
                estado = "rojo";
                alertas.push("Déficit hídrico severo");
                recomendaciones.push("Aplicar riego urgente");
            }

            recomendaciones.push("Revisar fertilización nitrogenada");
        }

        // FLORACIÓN
        if (etapa === "floracion") {
            if (t > 33) {
                estado = "rojo";
                alertas.push("Alta temperatura en floración");
                recomendaciones.push("Mantener lámina de agua estable");
            }

            if (l === "alta") {
                estado = "amarillo";
                alertas.push("Exceso de lluvia afecta floración");
                recomendaciones.push("Revisar drenajes");
            }
        }

        // LLENADO DE GRANO
        if (etapa === "llenado") {
            if (t > 32) {
                estado = "amarillo";
                alertas.push("Temperatura alta afecta llenado");
            }

            if (h < 60) {
                estado = "amarillo";
                alertas.push("Déficit hídrico en llenado");
            }

            recomendaciones.push("No suspender riego prematuramente");
        }

        // AJUSTES POR TIPO DE SIEMBRA
        if (tipo === "inundado") {
            recomendaciones.push("Controlar nivel de lámina de agua");
        }

        return { estado, alertas, recomendaciones, razones };
        
    }
    // ===== EXPLICACIÓN DEL SEMÁFORO =====
const explicacion = {
    verde: "El cultivo se encuentra en condiciones adecuadas.",
    amarillo: "Existen factores que requieren atención.",
    rojo: "Las condiciones actuales pueden afectar el rendimiento."
}

    // ===== EJECUCIÓN FINAL =====
    obtenerClima(canton).then(clima => {
        if (!clima) return;

        document.getElementById("temp").textContent = clima.temperatura;
        document.getElementById("humedad").textContent = clima.humedad;
        document.getElementById("lluvia").textContent = clima.lluvia;

        const resultado = analizarClima(clima, etapa, tipo);

        const estadoDiv = document.getElementById("estadoCultivo");
        estadoDiv.textContent = `Estado del cultivo: ${resultado.estado.toUpperCase()}`;
        estadoDiv.classList.remove("verde", "amarillo", "rojo");
        estadoDiv.classList.add(resultado.estado);

        const explicacionP = document.getElementById("explicacionEstado");
        explicacionP.innerHTML = resultado.razones.length > 0
            ? "📌 <strong>Motivos:</strong><br>" + resultado.razones.join("<br>")
            : explicacion[resultado.estado];

        const alertasUl = document.getElementById("alertas");
        alertasUl.innerHTML = resultado.alertas.length
            ? resultado.alertas.map(a => `<li>${a}</li>`).join("")
            : "<li>Sin alertas</li>";

        const recoUl = document.getElementById("recomendaciones");
        recoUl.innerHTML = resultado.recomendaciones.length
            ? resultado.recomendaciones.map(r => `<li>${r}</li>`).join("")
            : "<li>Sin recomendaciones</li>";
    });
}
