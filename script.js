document.addEventListener("DOMContentLoaded", () => {

  // ================= CONFIGURAÇÃO =================
  const INTERVALO = 300; // segundos
  let LAT = -20.8113;
  let LON = -49.3758;
  let restante = INTERVALO;
  let alertaDisparado = false;

  // ================= ELEMENTOS =================
  const cidadeAtualEl = document.getElementById("cidadeAtual");
  const statusEl = document.getElementById("status");
  const detalheEl = document.getElementById("detalhe");
  const alertaEl = document.getElementById("alerta");
  const contadorEl = document.getElementById("contador");
  const ultimaAtualizacaoEl = document.getElementById("ultimaAtualizacao");

  const cidadeInput = document.getElementById("cidade");
  const btnBuscar = document.getElementById("btnBuscar");
  const btnGPS = document.getElementById("btnGPS");
  const btnRefresh = document.getElementById("btnRefresh");
  const audio = document.getElementById("alertSound");

  // ================= EVENTOS =================
  btnBuscar.addEventListener("click", buscarCidade);
  btnGPS.addEventListener("click", usarGPS);
  btnRefresh.addEventListener("click", () => window.location.reload());

  // ================= AUDIO =================
  // Função de alerta sonoro desativada temporariamente, sem remover o código.
  // let audioLiberado = false;

  // document.addEventListener("click", () => {
  //   if (!audioLiberado && audio) {
  //     audio.play().then(() => {
  //       audio.pause();
  //       audio.currentTime = 0;
  //       audioLiberado = true;
  //       console.log("🔓 Som liberado");
  //     }).catch(() => {});
  //   }
  // }, { once: true });

  // ================= FUNÇÕES =================
  function mostrarCidade(nome) {
    cidadeAtualEl.innerHTML = `📍 Cidade: <b>${nome}</b>`;
  }

  function definirStatus(prob, chuva) {
    if (chuva > 0.5) return "🔴 Chuva forte ⛈️";
    if (prob >= 40) return "🟠 Chuva se aproximando";
    if (prob >= 20) return "🟡 Chuva possível";
    return "🟢 Sem chuva";
  }

  function renderizarAlerta(prob, chuva, temperatura, vento) {
    const alertaAtivo = prob >= 40 || chuva > 0.5;

    const blocoAlerta = alertaAtivo
      ? `
        <div class="alerta">
          ⛈️ ALERTA DE CHUVA!<br>
          Prob.: ${prob}% | Precip.: ${chuva.toFixed(2)} mm
        </div>
      `
      : '<div class="sem-alerta">✅ Sem alerta de chuva no momento.</div>';

    alertaEl.innerHTML = `
      ${blocoAlerta}
      <div class="info-clima">🌡️ Temperatura: <b>${temperatura.toFixed(1)}°C</b></div>
      <div class="info-clima">💨 Vento: <b>${vento.toFixed(1)} km/h</b></div>
    `;
  }

  async function buscarCidade() {
    try {
      const nome = cidadeInput.value.trim();
      if (!nome) throw "Digite a cidade";

      statusEl.innerText = "⏳ Buscando cidade...";
      alertaEl.innerHTML = "";

      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nome)}&count=1&language=pt`
      );

      if (!r.ok) throw "Erro ao buscar cidade";

      const data = await r.json();
      if (!data.results) throw "Cidade não encontrada";

      LAT = data.results[0].latitude;
      LON = data.results[0].longitude;

      mostrarCidade(data.results[0].name);
      atualizarTudo();
    } catch (e) {
      statusEl.innerText = "❌ " + e;
      alertaEl.innerHTML = "";
    }
  }

  function usarGPS() {
    if (!navigator.geolocation) {
      statusEl.innerText = "❌ Geolocalização não suportada";
      return;
    }

    statusEl.innerText = "📍 Obtendo localização...";
    alertaEl.innerHTML = "";

    navigator.geolocation.getCurrentPosition(async pos => {
      LAT = pos.coords.latitude;
      LON = pos.coords.longitude;

      let nomeCidade = "Local atual";

      try {
        const r = await fetch(
          `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${LAT}&longitude=${LON}&language=pt`
        );

        if (r.ok) {
          const data = await r.json();
          if (data.results && data.results.length > 0) {
            nomeCidade = data.results[0].name;
          }
        }
      } catch {}

      mostrarCidade(nomeCidade);
      atualizarTudo();
    }, () => {
      statusEl.innerText = "❌ Permissão de localização negada";
    });
  }

  async function atualizarPrevisao() {
    try {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=precipitation_probability,precipitation,temperature_2m,wind_speed_10m&timezone=America/Sao_Paulo`
      );

      if (!r.ok) throw "Erro na previsão";

      const data = await r.json();

      const prob = Math.max(...data.hourly.precipitation_probability.slice(0, 4));
      const chuva = Math.max(...data.hourly.precipitation.slice(0, 4));
      const temperatura = data.hourly.temperature_2m[0];
      const vento = data.hourly.wind_speed_10m[0];

      statusEl.innerText = definirStatus(prob, chuva);
      detalheEl.innerHTML = `
        Probabilidade máx.: <b>${prob}%</b><br>
        Precipitação: <b>${chuva.toFixed(2)} mm</b>
      `;

      dispararAlerta(prob, chuva);
      renderizarAlerta(prob, chuva, temperatura, vento);

      if (prob < 20 && chuva === 0) {
        alertaDisparado = false;
      }

      const agora = new Date();
      const horaFormatada = agora.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      });

      ultimaAtualizacaoEl.innerText = `🕒 Última atualização: ${horaFormatada}`;
      restante = INTERVALO;

    } catch (e) {
      statusEl.innerText = "❌ Erro ao atualizar previsão";
      alertaEl.innerHTML = "";
      console.error("Erro atualizarPrevisao:", e);
    }
  }

  function dispararAlerta(prob, chuva) {
    if (alertaDisparado) return;

    if (prob >= 40 || chuva > 0.5) {
      alertaDisparado = true;

      // if (audioLiberado && audio) {
      //   audio.currentTime = 0;
      //   audio.play().catch(() => {});
      // }
    }
  }

  function atualizarContador() {
    const m = Math.floor(restante / 60);
    const s = restante % 60;
    contadorEl.innerText =
      `🔄 Próxima atualização em ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    if (restante > 0) restante--;
  }

  function atualizarTudo() {
    atualizarPrevisao();
  }

  // ================= INICIALIZAÇÃO =================
  mostrarCidade("S J Rio Preto");
  atualizarTudo();
  atualizarContador();

  setInterval(atualizarPrevisao, INTERVALO * 1000);
  setInterval(atualizarContador, 1000);

});
