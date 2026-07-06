<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AunordMED — Comprovante de Repasse</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
:root{
  --g1:#0D3D20;--g2:#145C30;--g3:#1A7A3E;--g4:#22994D;--g5:#3DB368;--g6:#A8DCBA;--g7:#E8F5ED;
  --gray0:#0F172A;--gray1:#1E293B;--gray2:#475569;--gray3:#94A3B8;--gray4:#CBD5E1;--gray5:#E2E8F0;--gray6:#F1F5F9;
  --blue:#1A56DB;--blue-l:#EBF5FF;
  --orange:#D97706;--orange-l:#FFFBEB;
  --surface:#fff;--bg:#F0F4F2;--border:#D4E6DA;
  --radius:10px;--radius-lg:14px;--radius-xl:20px;
  --mono:'JetBrains Mono',monospace;--sans:'Inter',sans-serif;
  --sh:0 1px 3px rgba(0,0,0,.06);--sh-md:0 8px 24px rgba(0,0,0,.1);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--sans);background:var(--bg);color:var(--gray0);min-height:100vh;padding:24px 16px}

/* LOADING */
.lov{position:fixed;inset:0;background:#fff;z-index:999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-size:14px;color:var(--gray2)}
.lov.hide{display:none}
.spin-big{width:36px;height:36px;border:3px solid var(--g6);border-top-color:var(--g4);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.wrapper{max-width:700px;margin:0 auto}

/* HEADER */
.header-card{background:linear-gradient(135deg,var(--g1) 0%,var(--g3) 100%);border-radius:var(--radius-xl);padding:28px 32px 24px;margin-bottom:16px;position:relative;overflow:hidden}
.header-card::before{content:'';position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.05)}
.header-card::after{content:'';position:absolute;bottom:-80px;left:-30px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.03)}
.hc-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px;position:relative;z-index:1}
.logo-area .logo-name{font-size:22px;font-weight:700;color:#fff;letter-spacing:-.3px}
.logo-area .logo-name span{color:var(--g5)}
.logo-area .logo-sub{font-size:10px;color:rgba(255,255,255,.5);letter-spacing:.6px;margin-top:2px}
.doc-info{text-align:right}
.doc-num{font-size:13px;font-weight:700;color:#fff;font-family:var(--mono)}
.doc-data{font-size:11px;color:rgba(255,255,255,.5);margin-top:3px}
.medico-row{display:flex;align-items:center;gap:14px;position:relative;z-index:1}
.avatar{width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;flex-shrink:0;border:2px solid rgba(255,255,255,.25)}
.medico-nome{font-size:20px;font-weight:700;color:#fff;line-height:1.2}
.medico-crm{font-size:12px;color:rgba(255,255,255,.6);margin-top:3px}
.medico-esp{font-size:11px;color:rgba(255,255,255,.4);margin-top:2px}
.status-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:99px;font-size:11px;font-weight:600;margin-top:8px;background:rgba(61,179,104,.2);color:#6EE7A0;border:1px solid rgba(61,179,104,.3)}

/* VALOR PRINCIPAL */
.valor-card{background:var(--surface);border-radius:var(--radius-xl);padding:24px 28px;margin-bottom:12px;box-shadow:var(--sh);border:1px solid var(--border)}
.vc-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px}
.vc-label{font-size:11px;font-weight:600;color:var(--gray3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.vc-valor{font-size:42px;font-weight:700;font-family:var(--mono);color:var(--g2);line-height:1}
.vc-valor sup{font-size:18px;font-weight:500;color:var(--gray3);vertical-align:super;margin-right:4px}
.vc-seq{background:var(--g7);border:1px solid var(--g6);border-radius:var(--radius);padding:6px 14px;font-size:12px;font-weight:700;color:var(--g2);font-family:var(--mono)}
.vc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px}
.vc-item{background:var(--gray6);border-radius:var(--radius);padding:12px 14px}
.vc-item-lbl{font-size:10px;font-weight:600;color:var(--gray3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px}
.vc-item-val{font-size:13px;font-weight:600;color:var(--gray1);font-family:var(--mono)}
.pix-row{background:var(--g7);border:1px solid var(--g6);border-radius:var(--radius);padding:12px 14px;margin-top:10px;display:flex;align-items:center;gap:10px}
.pix-ic{width:32px;height:32px;border-radius:8px;background:var(--g4);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.pix-lbl{font-size:10px;font-weight:600;color:var(--g3);text-transform:uppercase;letter-spacing:.4px}
.pix-val{font-size:13px;font-weight:600;color:var(--g2);font-family:var(--mono)}

/* RESUMO */
.resumo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
.rg-item{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px;box-shadow:var(--sh)}
.rg-lbl{font-size:10px;font-weight:600;color:var(--gray3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px}
.rg-val{font-size:17px;font-weight:700;font-family:var(--mono);color:var(--gray0);line-height:1.2}
.rg-sub{font-size:10px;color:var(--gray3);margin-top:3px}

/* HISTÓRICO */
.hist-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-xl);overflow:hidden;margin-bottom:12px;box-shadow:var(--sh)}
.hist-hd{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px}
.hist-hd h3{font-size:13px;font-weight:600;color:var(--gray0);display:flex;align-items:center;gap:7px}
.hist-filtro select{height:30px;border:1.5px solid var(--border);border-radius:var(--radius);padding:0 10px;font-family:var(--sans);font-size:12px;color:var(--gray1);background:var(--gray6)}
.hist-table{width:100%;border-collapse:collapse;font-size:12.5px}
.hist-table thead tr{background:var(--g1)}
.hist-table th{padding:9px 14px;text-align:left;font-size:9px;font-weight:700;color:var(--g6);text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
.hist-table td{padding:10px 14px;border-bottom:1px solid var(--gray6);vertical-align:middle}
.hist-table tbody tr:last-child td{border-bottom:none}
.hist-table tbody tr:hover{background:var(--g7)}
.mono{font-family:var(--mono)}
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600}
.b-pag{background:var(--g7);color:var(--g2);border:1px solid var(--g6)}
.b-rec{background:var(--blue-l);color:var(--blue);border:1px solid #93C5FD}
.b-emit{background:var(--orange-l);color:var(--orange);border:1px solid #FDE68A}
.hist-total{padding:12px 16px;background:var(--g7);border-top:1px solid var(--g6);display:flex;justify-content:space-between;align-items:center}
.hist-total span{font-size:13px;font-weight:500;color:var(--gray2)}
.hist-total strong{font-family:var(--mono);font-weight:700;color:var(--g1);font-size:16px}
.hist-empty{text-align:center;padding:28px;color:var(--gray3);font-size:13px}

/* AÇÕES (só tela, não imprime) */
.acoes-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-xl);padding:18px 22px;margin-bottom:16px;box-shadow:var(--sh)}
.acoes-title{font-size:11px;font-weight:700;color:var(--gray3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px}
.acoes-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.btn{cursor:pointer;border:none;border-radius:var(--radius);font-family:var(--sans);font-size:13px;font-weight:500;padding:10px 18px;transition:all .15s;display:inline-flex;align-items:center;gap:7px}
.btn:active{transform:scale(.97)}
.btn-wpp{background:#25D366;color:#fff;flex:1}.btn-wpp:hover{background:#1DA851}
.btn-copy{background:var(--g3);color:#fff;flex:1}.btn-copy:hover{background:var(--g2)}
.btn-print{background:var(--gray6);color:var(--gray1);border:1px solid var(--border)}.btn-print:hover{background:var(--gray5)}
.btn-ghost{background:transparent;color:var(--gray2);border:1px solid var(--border);font-size:12px;padding:6px 12px}.btn-ghost:hover{background:var(--gray6)}
.link-box{background:var(--gray6);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px;display:flex;align-items:center;gap:10px}
.link-box span{flex:1;font-size:11px;font-family:var(--mono);color:var(--gray2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* TOAST */
.toast{position:fixed;bottom:20px;right:20px;background:var(--g1);color:#fff;padding:11px 18px;border-radius:var(--radius-lg);font-size:13px;font-weight:500;z-index:999;transform:translateY(60px);opacity:0;transition:all .3s cubic-bezier(.34,1.56,.64,1);border-left:4px solid var(--g5);box-shadow:var(--sh-md)}
.toast.show{transform:translateY(0);opacity:1}
.toast.wpp{background:#075E54;border-left-color:#25D366}
.toast.err{background:#7F1D1D;border-left-color:#DC2626}

/* FOOTER */
.footer{text-align:center;padding:16px;font-size:11px;color:var(--gray3)}
.footer strong{color:var(--gray2)}

/* DASHBOARD PREMIUM */
/* ═══ DASHBOARD ═══ */
@keyframes fadeUp{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
@keyframes lineIn{from{stroke-dashoffset:2000}to{stroke-dashoffset:0}}
@keyframes dotPop{0%{r:0;opacity:0}80%{r:7}100%{r:5;opacity:1}}
@keyframes barIn{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes pulseDot{0%,100%{opacity:.5;r:3}50%{opacity:1;r:5}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.dsh{margin-bottom:22px;border-radius:18px;overflow:hidden;background:#020c06;border:1px solid rgba(74,222,128,.15)}
.dsh-3d{position:relative;height:210px;overflow:hidden;background:#020c06}
.dsh-3d canvas{width:100%!important;height:210px!important;display:block}
.dsh-3d-fade{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 45%,#020c06 100%);pointer-events:none;z-index:2}
.dsh-kpis-top{position:absolute;top:14px;left:0;right:0;display:grid;grid-template-columns:repeat(3,1fr);z-index:3;pointer-events:none}
.dsh-kt{text-align:center;animation:fadeUp .5s ease both}
.dsh-kt:nth-child(2){animation-delay:.08s}
.dsh-kt:nth-child(3){animation-delay:.16s}
.dsh-kt-lbl{font-size:9px;letter-spacing:1.8px;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:3px;font-weight:600}
.dsh-kt-val{font-size:17px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#4ade80;line-height:1}
.dsh-kt-sub{font-size:9px;color:rgba(255,255,255,.22);margin-top:3px}
.dsh-id{position:absolute;bottom:16px;left:0;right:0;text-align:center;z-index:3;pointer-events:none;animation:fadeUp .5s .3s ease both;opacity:0;animation-fill-mode:forwards}
.dsh-id-eye{font-size:8px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(74,222,128,.4);margin-bottom:3px}
.dsh-id-name{font-size:15px;font-weight:700;color:#fff}
.dsh-id-per{font-size:10px;color:rgba(255,255,255,.28);margin-top:2px}
.dsh-body{display:grid;grid-template-columns:1fr 1fr;background:#020c06}
.dsh-col{padding:18px 20px;border-top:1px solid rgba(74,222,128,.08)}
.dsh-col:first-child{border-right:1px solid rgba(74,222,128,.08)}
.dsh-col-title{font-size:9px;letter-spacing:1.8px;text-transform:uppercase;color:rgba(74,222,128,.5);margin-bottom:13px;font-weight:600}
.dsh-hrow{display:flex;align-items:center;gap:7px;margin-bottom:7px;animation:fadeUp .4s ease both}
.dsh-hrow:last-of-type{margin-bottom:0}
.dsh-hlbl{font-size:11px;color:#fff;width:46px;text-align:right;flex-shrink:0;font-weight:500}
.dsh-htrack{flex:1;background:rgba(255,255,255,.04);border-radius:20px;height:15px;position:relative;overflow:hidden}
.dsh-hfill{height:100%;border-radius:20px;position:absolute;left:0;top:0;width:0;transition:width 1.1s cubic-bezier(.34,1.4,.64,1);background:linear-gradient(90deg,#052e16,#16a34a,#4ade80)}
.dsh-hrep{height:100%;border-radius:20px;position:absolute;left:0;top:0;width:0;transition:width 1.1s cubic-bezier(.34,1.4,.64,1) .1s;background:linear-gradient(90deg,rgba(74,222,128,.2),rgba(74,222,128,.1))}
.dsh-hval{font-size:10px;font-family:'JetBrains Mono',monospace;color:#4ade80;width:62px;flex-shrink:0;font-weight:600}
.dsh-lgd{display:flex;gap:10px;margin-top:11px;padding-top:9px;border-top:1px solid rgba(74,222,128,.07);font-size:10px;color:rgba(255,255,255,.3)}
.dsh-lgd span{display:flex;align-items:center;gap:4px}
.dsh-lgd i{width:10px;height:4px;border-radius:2px;display:inline-block}
.dsh-lwrap{position:relative;height:82px}
.dsh-ltip{position:absolute;background:#020c06;border:1px solid rgba(74,222,128,.35);color:#fff;border-radius:8px;padding:5px 10px;font-size:10px;font-family:'JetBrains Mono',monospace;pointer-events:none;transform:translate(-50%,-150%);white-space:nowrap;opacity:0;transition:opacity .15s;z-index:20}
.dsh-xax{display:flex;justify-content:space-between;font-size:9px;color:rgba(255,255,255,.28);margin-top:3px}
/* ══ PRINT ══════════════════════════════════════════════════ */
@media print{
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{background:#fff;padding:0;margin:0;font-size:12px}
  .acoes-card,.toast,.lov{display:none!important}
  .wrapper{max-width:100%;margin:0}
  .header-card{border-radius:0;margin:0 0 14px;padding:20px 24px}
  .logo-area .logo-name{font-size:18px}
  .medico-nome{font-size:16px}
  .vc-valor{font-size:32px}
  .valor-card,.hist-card,.resumo-grid .rg-item{box-shadow:none;border:1px solid #D1D5DB}
  .valor-card{margin-bottom:10px;padding:18px 20px}
  .resumo-grid{margin-bottom:10px;gap:8px}
  .hist-table th,.hist-table td{padding:7px 12px}
  .footer{margin-top:10px;border-top:1px solid #E5E7EB;padding-top:10px}

  /* Rodapé de impressão */
  .print-footer{display:flex!important;justify-content:space-between;align-items:center;padding:12px 0 0;margin-top:12px;border-top:2px solid var(--g6);font-size:10px;color:var(--gray3)}
  .print-footer .pf-logo{font-size:13px;font-weight:700;color:var(--g2)}
  .print-footer .pf-logo span{color:var(--g4)}
  .print-footer .pf-info{text-align:right}

  /* Marca d'água sutil */
  .header-card::before,.header-card::after{display:none}
}
.print-footer{display:none}

@media(max-width:500px){
  .vc-grid{grid-template-columns:1fr 1fr}
  .resumo-grid{grid-template-columns:1fr 1fr}
  .acoes-row{flex-direction:column}
  body{padding:12px 10px}
}
</style>
</head>
<body>
<div class="lov" id="lov"><div class="spin-big"></div><span>Carregando comprovante...</span></div>

<div class="wrapper" id="wrapper" style="display:none">

  <!-- HEADER -->
  <div class="header-card">
    <div class="hc-top">
      <div class="logo-area">
        <div class="logo-name">Aunord<span>MED</span></div>
        <div class="logo-sub">FINANCEIRO</div>
      </div>
      <div class="doc-info">
        <div class="doc-num" id="doc-num">Comprovante #—</div>
        <div class="doc-data" id="doc-data">—</div>
      </div>
    </div>
    <div class="medico-row">
      <div class="avatar" id="avatar">—</div>
      <div>
        <div class="medico-nome" id="med-nome">—</div>
        <div class="medico-crm" id="med-crm">—</div>
        <div class="medico-esp" id="med-esp"></div>
        <div class="status-pill">✓ Repasse efetuado</div>
      </div>
    </div>
  </div>

  <!-- VALOR -->
  <div class="valor-card">
    <div class="vc-header">
      <div>
        <div class="vc-label">Valor do repasse</div>
        <div class="vc-valor"><sup>R$</sup><span id="vc-valor">0,00</span></div>
      </div>
      <div class="vc-seq" id="vc-seq">#001</div>
    </div>
    <div class="vc-grid">
      <div class="vc-item"><div class="vc-item-lbl">Data do pagamento</div><div class="vc-item-val" id="vc-data">—</div></div>
      <div class="vc-item"><div class="vc-item-lbl">Competência</div><div class="vc-item-val" id="vc-comp">—</div></div>
      <div class="vc-item"><div class="vc-item-lbl">Tomador</div><div class="vc-item-val" id="vc-tomador">—</div></div>
    </div>
    <div class="pix-row" id="pix-row" style="display:none">
      <div class="pix-ic">🏧</div>
      <div><div class="pix-lbl">Chave PIX</div><div class="pix-val" id="pix-val">—</div></div>
    </div>
  </div>

  <!-- RESUMO MÊS -->
  <div class="resumo-grid" id="resumo-grid"></div>

        <!-- DASHBOARD FATURAMENTO -->
  <div class="dsh" id="dash-card" style="display:none">
    <div class="dsh-3d">
      <canvas id="dsh-3d"></canvas>
      <div class="dsh-3d-fade"></div>
      <div class="dsh-kpis-top">
        <div class="dsh-kt">
          <div class="dsh-kt-lbl">Total bruto</div>
          <div class="dsh-kt-val" id="dk-bruto">—</div>
          <div class="dsh-kt-sub">acumulado</div>
        </div>
        <div class="dsh-kt">
          <div class="dsh-kt-lbl">Total repasse</div>
          <div class="dsh-kt-val" id="dk-repasse" style="color:#86efac">—</div>
          <div class="dsh-kt-sub">após retenção</div>
        </div>
        <div class="dsh-kt">
          <div class="dsh-kt-lbl">NFs vinculadas</div>
          <div class="dsh-kt-val" id="dk-nfs" style="color:#93c5fd">—</div>
          <div class="dsh-kt-sub">total de notas</div>
        </div>
      </div>
      <div class="dsh-id">
        <div class="dsh-id-eye">AunordMED · Faturamento</div>
        <div class="dsh-id-name" id="dash-nome-med">—</div>
        <div class="dsh-id-per" id="dash-periodo">—</div>
      </div>
    </div>
    <div class="dsh-body">
      <div class="dsh-col">
        <div class="dsh-col-title">Faturamento mensal</div>
        <div id="dash-bars"></div>
        <div class="dsh-lgd">
          <span><i style="background:linear-gradient(90deg,#052e16,#4ade80)"></i>Bruto</span>
          <span><i style="background:rgba(74,222,128,.25)"></i>Repasse</span>
        </div>
      </div>
      <div class="dsh-col">
        <div class="dsh-col-title">Evolução do repasse</div>
        <div class="dsh-lwrap">
          <svg id="dash-lsvg" style="width:100%;height:82px;overflow:visible" viewBox="0 0 240 82" preserveAspectRatio="none"></svg>
          <div class="dsh-ltip" id="dash-ltip"></div>
        </div>
        <div class="dsh-xax" id="dash-xaxis"></div>
      </div>
    </div>
  </div>

  <!-- HISTÓRICO -->
  <div class="hist-card">
    <div class="hist-hd">
      <h3>📋 Histórico de notas fiscais</h3>
      <div class="hist-filtro">
        <select id="hist-mes" onchange="renderHistorico()">
          <option value="">Todos os meses</option>
        </select>
      </div>
    </div>
    <div id="hist-wrap"></div>
    <div class="hist-total" id="hist-total" style="display:none">
      <span>Total no período</span>
      <strong id="hist-total-val">R$ 0,00</strong>
    </div>
  </div>

  <!-- AÇÕES (não aparece na impressão) -->
  <div class="acoes-card">
    <div class="acoes-title">Compartilhar comprovante</div>
    <div class="acoes-row">
      <button class="btn btn-wpp" onclick="enviarWhatsApp()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.535 5.858L.057 23.633a.5.5 0 00.61.61l5.775-1.478A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 01-5.031-1.392l-.361-.214-3.731.955.971-3.625-.235-.373A9.784 9.784 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
        Enviar por WhatsApp
      </button>
      <button class="btn btn-copy" onclick="copiarLink()">🔗 Copiar link</button>
      <button class="btn btn-print" onclick="imprimirComp()">🖨️ Imprimir</button>
    </div>
    <div class="link-box">
      <span id="link-txt"></span>
      <button class="btn btn-ghost" onclick="copiarLink()">Copiar</button>
    </div>
  </div>

  <!-- RODAPÉ DE IMPRESSÃO -->
  <div class="print-footer">
    <div>
      <div class="pf-logo">Aunord<span>MED</span> Financeiro</div>
      <div style="font-size:10px;color:var(--gray3);margin-top:2px">Documento gerado em <span id="print-data"></span></div>
    </div>
    <div class="pf-info">
      <div id="print-num" style="font-weight:600;color:var(--gray2)"></div>
      <div style="margin-top:2px">Documento válido apenas como comprovante interno</div>
    </div>
  </div>

  <div class="footer">Gerado por <strong>AunordMED Financeiro</strong> · <span id="footer-data"></span></div>
</div>

<div class="toast" id="toast"></div>

<script>
const SUPA_URL='https://hleesgnzpkjuhjshyaal.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWVzZ256cGtqdWhqc2h5YWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODczMTksImV4cCI6MjA5Nzk2MzMxOX0.jnVO9Bqo-s5DPK0-tFeYr_UeBaEkXCmVa2xhA93aVDk';
const H={'Content-Type':'application/json','apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Prefer':'return=representation'};
async function sGet(t,q=''){const r=await fetch(`${SUPA_URL}/rest/v1/${t}?${q}`,{headers:H});if(!r.ok)throw new Error(await r.text());return r.json();}
async function sPatch(t,id,b){const r=await fetch(`${SUPA_URL}/rest/v1/${t}?id=eq.${id}`,{method:'PATCH',headers:H,body:JSON.stringify(b)});if(!r.ok)throw new Error(await r.text());return r.json();}

let comp=null,medico=null,notas=[],numSeq=1;
let cfg={wppUrl:'',wppKey:'',wppInst:'aunordmed'};

const brl=v=>Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtMes=m=>{if(!m)return'—';const[y,mo]=m.split('-');const ms=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];return`${ms[+mo-1]}/${y}`;};
const fmtDt=d=>{if(!d)return'—';const p=d.split('T')[0].split('-');return`${p[2]}/${p[1]}/${p[0]}`;};
const ini=n=>n.split(' ').filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join('');
const avc=n=>{const cs=['#22994D','#1A56DB','#D97706','#7C3AED','#DB2777','#0891B2'];let h=0;for(let c of n)h=(h*31+c.charCodeAt(0))%cs.length;return cs[Math.abs(h)];};
const pad=n=>String(n).padStart(3,'0');

function toast(m,tp=''){const e=document.getElementById('toast');e.textContent=m;e.className='toast '+(tp||'');e.classList.add('show');setTimeout(()=>e.classList.remove('show'),3000);}
function getToken(){return new URLSearchParams(window.location.search).get('token')||new URLSearchParams(window.location.search).get('t');}

async function init(){
  const s=localStorage.getItem('am_cfg4');if(s)cfg={...cfg,...JSON.parse(s)};
  const token=getToken();
  const hoje=new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  document.getElementById('footer-data').textContent=hoje;
  document.getElementById('print-data').textContent=hoje;
  document.getElementById('link-txt').textContent=window.location.href;

  if(!token){mostrarDemo();return;}
  try{
    // Buscar comprovante
    const comps=await sGet('comprovantes',`token=eq.${token}&limit=1`);
    if(!comps||!comps.length){mostrarErro('Comprovante não encontrado.');return;}
    comp=comps[0];

    // Incrementar visualizações
    sPatch('comprovantes',comp.id,{visualizacoes:(comp.visualizacoes||0)+1}).catch(()=>{});

    // Buscar médico
    const meds=await sGet('medicos',`nome=eq.${encodeURIComponent(comp.medico_nome)}&limit=1`).catch(()=>[]);
    medico=meds[0]||null;

    // Buscar todas as notas do médico para histórico
    const todasNotas=await sGet('notas_fiscais','order=criado_em.asc').catch(()=>[]);
    notas=todasNotas.filter(n=>n.medicos_nota?.some(mn=>mn.nome===comp.medico_nome)||n.nomes_medicos?.includes(comp.medico_nome));

    // Calcular número sequencial: quantos comprovantes este médico tem até este
    const todosComps=await sGet('comprovantes',`medico_nome=eq.${encodeURIComponent(comp.medico_nome)}&order=criado_em.asc`).catch(()=>[]);
    const idx=todosComps.findIndex(c=>c.token===token);
    numSeq=idx>=0?idx+1:1;

    renderComprovante();
  }catch(e){mostrarErro('Erro: '+e.message);}
}

function mostrarDemo(){
  comp={token:'demo',medico_nome:'Dr. João Silva',medico_crm:'CRM/SE 12345',tomador:'Unimed Sergipe',valor_repasse:4250.00,data_pagamento:new Date().toISOString().split('T')[0],competencia:new Date().toISOString().substring(0,7),dados_extras:{nf:'00042',pix:'123.456.789-00',tipo_pix:'CPF'}};
  medico={especialidade:'Clínica Médica',chave_pix:'123.456.789-00',tipo_pix:'cpf',telefone_whatsapp:'5511999999999'};
  notas=[
    {nf:'00042',tomador:'Unimed Sergipe',comp:new Date().toISOString().substring(0,7),status:'Paga ao médico',medicos_nota:[{nome:'Dr. João Silva',valor_bruto_medico:5000,repasse:4350}]},
    {nf:'00038',tomador:'Bradesco Saúde',comp:new Date(Date.now()-30*24*3600000).toISOString().substring(0,7),status:'Paga ao médico',medicos_nota:[{nome:'Dr. João Silva',valor_bruto_medico:3800,repasse:3306}]},
    {nf:'00031',tomador:'Unimed Sergipe',comp:new Date(Date.now()-60*24*3600000).toISOString().substring(0,7),status:'Paga ao médico',medicos_nota:[{nome:'Dr. João Silva',valor_bruto_medico:4200,repasse:3654}]},
  ];
  numSeq=3;
  renderComprovante();
}

function mostrarErro(msg){
  document.getElementById('lov').classList.add('hide');
  document.getElementById('wrapper').style.display='block';
  document.getElementById('wrapper').innerHTML=`<div style="text-align:center;padding:60px 20px;background:#fff;border-radius:20px"><div style="font-size:48px;margin-bottom:16px">❌</div><h2 style="color:#1E293B;margin-bottom:8px">Comprovante não encontrado</h2><p style="color:#94A3B8">${msg}</p></div>`;
}

function renderComprovante(){
  document.getElementById('lov').classList.add('hide');
  document.getElementById('wrapper').style.display='block';

  const nome=comp.medico_nome||'—';
  const numStr=`#${pad(numSeq)}`;

  document.getElementById('doc-num').textContent=`Comprovante ${numStr}`;
  document.getElementById('doc-data').textContent=`Emitido em ${new Date().toLocaleDateString('pt-BR')}`;
  document.getElementById('print-num').textContent=`Comprovante ${numStr}`;
  document.getElementById('avatar').textContent=ini(nome);
  document.getElementById('avatar').style.background=avc(nome);
  document.getElementById('med-nome').textContent=nome;
  document.getElementById('med-crm').textContent=comp.medico_crm||medico?.crm||'—';
  if(medico?.especialidade)document.getElementById('med-esp').textContent=medico.especialidade;

  document.getElementById('vc-seq').textContent=numStr;
  document.getElementById('vc-valor').textContent=brl(comp.valor_repasse);
  document.getElementById('vc-data').textContent=fmtDt(comp.data_pagamento);
  document.getElementById('vc-comp').textContent=fmtMes(comp.competencia);
  document.getElementById('vc-tomador').textContent=comp.tomador||'—';

  const pix=comp.dados_extras?.pix||medico?.chave_pix;
  if(pix){
    document.getElementById('pix-row').style.display='flex';
    document.getElementById('pix-val').textContent=`${(comp.dados_extras?.tipo_pix||medico?.tipo_pix||'PIX').toUpperCase()}: ${pix}`;
  }

  renderResumo();
  renderFiltroMes();
  renderHistorico();
  renderDash();
}

function renderResumo(){
  const mes=comp.competencia;
  const nm=notas.filter(n=>n.comp===mes);
  const tBruto=nm.reduce((a,n)=>{const mn=n.medicos_nota?.find(mn=>mn.nome===comp.medico_nome);return a+(mn?.valor_bruto_medico||0);},0);
  const tRep=nm.reduce((a,n)=>{const mn=n.medicos_nota?.find(mn=>mn.nome===comp.medico_nome);return a+(mn?.repasse||0);},0);
  document.getElementById('resumo-grid').innerHTML=`
    <div class="rg-item"><div class="rg-lbl">NFs no mês</div><div class="rg-val">${nm.length}</div><div class="rg-sub">${fmtMes(mes)}</div></div>
    <div class="rg-item"><div class="rg-lbl">Bruto no mês</div><div class="rg-val">R$ ${brl(tBruto)}</div><div class="rg-sub">Valor emitido</div></div>
    <div class="rg-item"><div class="rg-lbl">Repasse no mês</div><div class="rg-val" style="color:var(--g2)">R$ ${brl(tRep)}</div><div class="rg-sub">Valor líquido</div></div>`;
}

function renderFiltroMes(){
  const meses=[...new Set(notas.map(n=>n.comp).filter(Boolean))].sort().reverse();
  const sel=document.getElementById('hist-mes');
  sel.innerHTML='<option value="">Todos os meses</option>'+meses.map(m=>`<option value="${m}"${m===comp.competencia?' selected':''}>${fmtMes(m)}</option>`).join('');
}

function renderHistorico(){
  const mesFiltro=document.getElementById('hist-mes').value;
  const f=notas.filter(n=>!mesFiltro||n.comp===mesFiltro);
  const wrap=document.getElementById('hist-wrap');
  const tot=document.getElementById('hist-total');
  if(!f.length){wrap.innerHTML=`<div class="hist-empty">Nenhuma nota encontrada neste período</div>`;tot.style.display='none';return;}
  const totalRep=f.reduce((a,n)=>{const mn=n.medicos_nota?.find(mn=>mn.nome===comp.medico_nome);return a+(mn?.repasse||0);},0);
  wrap.innerHTML=`<table class="hist-table">
    <thead><tr><th>NF</th><th>Tomador</th><th>Competência</th><th>Bruto</th><th>Repasse</th><th>Status</th></tr></thead>
    <tbody>${f.map(n=>{
      const mn=n.medicos_nota?.find(mn=>mn.nome===comp.medico_nome);
      const bdg=n.status==='Paga ao médico'?'b-pag':n.status==='Recebida'?'b-rec':'b-emit';
      const lbl=n.status==='Paga ao médico'?'✓ Pago':n.status==='Recebida'?'Recebida':'Emitida';
      return`<tr><td class="mono" style="font-weight:600">${n.nf||'—'}</td><td>${n.tomador||'—'}</td><td class="mono">${fmtMes(n.comp)}</td><td class="mono">R$ ${brl(mn?.valor_bruto_medico||0)}</td><td class="mono" style="font-weight:600;color:var(--g2)">R$ ${brl(mn?.repasse||0)}</td><td><span class="badge ${bdg}">${lbl}</span></td></tr>`;
    }).join('')}</tbody>
  </table>`;
  tot.style.display='flex';
  document.getElementById('hist-total-val').textContent=`R$ ${brl(totalRep)}`;
}

var _dshRaf=null,_dshR=null;

function initDsh3D(meses){
  var cv=document.getElementById('dsh-3d');
  if(!cv||!window.THREE)return;
  if(_dshRaf){cancelAnimationFrame(_dshRaf);_dshRaf=null;}
  if(_dshR){_dshR.dispose();_dshR=null;}
  var W=cv.offsetWidth||340,H=210;
  cv.width=W*devicePixelRatio;cv.height=H*devicePixelRatio;
  var R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
  R.setSize(W,H);R.setPixelRatio(devicePixelRatio);R.setClearColor(0x000000,0);
  _dshR=R;
  var S=new THREE.Scene();
  var CAM=new THREE.PerspectiveCamera(42,W/H,.1,100);
  CAM.position.set(0,3.8,10);CAM.lookAt(0,0,0);
  var maxB=Math.max.apply(null,meses.map(function(m){return m.bruto;}));
  if(!maxB)maxB=1;
  var n=meses.length,sp=2.1,off=-(n-1)*sp/2;
  var bars=[];
  meses.forEach(function(m,i){
    var h=Math.max((m.bruto/maxB)*4,.2);
    var hr=Math.max((m.repasse/maxB)*4,.1);
    var x=off+i*sp;
    // Barra bruto
    var g=new THREE.BoxGeometry(.82,h,.82);
    var mat=new THREE.MeshStandardMaterial({color:0x16a34a,emissive:0x052e16,emissiveIntensity:.55,metalness:.65,roughness:.28});
    var b=new THREE.Mesh(g,mat);
    b.position.set(x,-2,0);b.userData.finalY=(h/2)-2;b.scale.y=.001;
    S.add(b);bars.push({m:b,delay:i*.12});
    // Borda wireframe
    var eg=new THREE.EdgesGeometry(g);
    var em=new THREE.LineBasicMaterial({color:0x4ade80,transparent:true,opacity:.18});
    var el=new THREE.LineSegments(eg,em);
    el.position.copy(b.position);S.add(el);
    // Barra repasse (frente)
    var g2=new THREE.BoxGeometry(.52,hr,.52);
    var m2=new THREE.MeshStandardMaterial({color:0x4ade80,emissive:0x14532d,emissiveIntensity:.65,metalness:.5,roughness:.2,transparent:true,opacity:.88});
    var b2=new THREE.Mesh(g2,m2);
    b2.position.set(x,-2,.52);b2.userData.finalY=(hr/2)-2;b2.scale.y=.001;
    S.add(b2);bars.push({m:b2,delay:i*.12+.06});
  });
  // Grid
  var grid=new THREE.GridHelper(18,18,0x14532d,0x052e16);
  grid.position.y=-2;S.add(grid);
  // Luzes
  S.add(new THREE.AmbientLight(0xffffff,.3));
  var dl=new THREE.DirectionalLight(0x4ade80,.9);dl.position.set(5,9,6);S.add(dl);
  var dl2=new THREE.DirectionalLight(0x22d3ee,.35);dl2.position.set(-5,6,-4);S.add(dl2);
  var pl=new THREE.PointLight(0x4ade80,1.6,14);pl.position.set(0,5,0);S.add(pl);
  // Partículas
  var pg=new THREE.BufferGeometry();
  var pc=80,pp=new Float32Array(pc*3);
  for(var i=0;i<pc*3;i++)pp[i]=(Math.random()-.5)*15;
  pg.setAttribute('position',new THREE.BufferAttribute(pp,3));
  var pts=new THREE.Points(pg,new THREE.PointsMaterial({color:0x4ade80,size:.055,transparent:true,opacity:.38}));
  S.add(pts);
  var t=0,startTime=performance.now();
  function loop(){
    _dshRaf=requestAnimationFrame(loop);
    t=(performance.now()-startTime)/1000;
    // Câmera orbita
    CAM.position.x=Math.sin(t*.22)*2.2;
    CAM.position.z=9.5+Math.cos(t*.17)*1.6;
    CAM.position.y=3.8+Math.sin(t*.14)*.55;
    CAM.lookAt(0,0,0);
    // Barras sobem com delay
    bars.forEach(function(bd){
      var elapsed=t-bd.delay;
      if(elapsed>0&&bd.m.scale.y<1){
        var prog=Math.min(elapsed/1.2,1);
        var ease=1-Math.pow(1-prog,3);
        bd.m.scale.y=Math.max(ease,.001);
        bd.m.position.y=bd.m.userData.finalY-(bd.m.userData.finalY+2)*(1-ease);
      }
    });
    // Partículas sobem
    var pa=pts.geometry.attributes.position;
    for(var i=0;i<pc;i++){pa.array[i*3+1]+=.007;if(pa.array[i*3+1]>5)pa.array[i*3+1]=-4;}
    pa.needsUpdate=true;
    pl.intensity=1.4+Math.sin(t*1.8)*.4;
    R.render(S,CAM);
  }
  loop();
}

function renderDash(){
  if(!notas||!notas.length)return;
  document.getElementById('dash-card').style.display='block';
  var totalBruto=0,totalRepasse=0,countNFs=0,porMes={};
  notas.forEach(function(n){
    var mn=n.medicos_nota&&n.medicos_nota.find(function(m){return m.nome===comp.medico_nome;});
    if(!mn)return;
    countNFs++;
    var br=mn.valor_bruto_medico||0,ret=mn.retencao_individual||13;
    var rep=mn.repasse||(br*(1-ret/100));
    totalBruto+=br;totalRepasse+=rep;
    var mes=n.comp||'';
    if(mes){if(!porMes[mes])porMes[mes]={label:fmtMes(mes),bruto:0,repasse:0};porMes[mes].bruto+=br;porMes[mes].repasse+=rep;}
  });
  document.getElementById('dk-bruto').textContent='R$ '+brl(totalBruto);
  document.getElementById('dk-repasse').textContent='R$ '+brl(totalRepasse);
  document.getElementById('dk-nfs').textContent=countNFs;
  document.getElementById('dash-nome-med').textContent=comp.medico_nome||'—';
  var meses=Object.keys(porMes).sort().map(function(k){return porMes[k];});
  if(meses.length)document.getElementById('dash-periodo').textContent=
    meses.length===1?meses[0].label:(meses[0].label+' – '+meses[meses.length-1].label);
  // Barras horizontais
  var maxB=Math.max.apply(null,meses.map(function(m){return m.bruto;}).concat([1]));
  var delay=0;
  document.getElementById('dash-bars').innerHTML=meses.map(function(m,i){
    var pB=Math.max(Math.round((m.bruto/maxB)*100),4);
    var pR=Math.max(Math.round((m.repasse/maxB)*100),2);
    return '<div class="dsh-hrow" style="animation-delay:'+((i*.08)+.2)+'s"><div class="dsh-hlbl">'+m.label+'</div><div class="dsh-htrack"><div class="dsh-hfill" style="width:0" data-w="'+pB+'"></div><div class="dsh-hrep" style="width:0" data-w="'+pR+'"></div></div><div class="dsh-hval">R$'+brl(m.bruto)+'</div></div>';
  }).join('');
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    document.querySelectorAll('.dsh-hfill,.dsh-hrep').forEach(function(el){el.style.width=el.dataset.w+'%';});
  });});
  // Linha SVG animada
  var svg=document.getElementById('dash-lsvg');
  if(meses.length>=2){
    var W=240,H=82,PX=12,PY=10;
    var vals=meses.map(function(m){return m.repasse;});
    var minV=Math.min.apply(null,vals),maxV=Math.max.apply(null,vals),rng=maxV-minV||1;
    var xs=meses.map(function(_,i){return PX+i*((W-PX*2)/(meses.length-1));});
    var ys=vals.map(function(v){return PY+(1-(v-minV)/rng)*(H-PY*2);});
    var d='M'+xs[0]+','+ys[0];
    for(var i=1;i<xs.length;i++){var cx=(xs[i-1]+xs[i])/2;d+=' C'+cx+','+ys[i-1]+' '+cx+','+ys[i]+' '+xs[i]+','+ys[i];}
    var area=d+' L'+xs[xs.length-1]+','+H+' L'+xs[0]+','+H+' Z';
    svg.innerHTML='<defs><linearGradient id="dlg4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4ade80" stop-opacity=".28"/><stop offset="100%" stop-color="#4ade80" stop-opacity="0"/></linearGradient></defs>'
      +'<path d="'+area+'" fill="url(#dlg4)"/>'
      +'<path d="'+d+'" fill="none" stroke="rgba(74,222,128,.15)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'
      +'<path d="'+d+'" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2000" stroke-dashoffset="2000" style="animation:lineIn 1.4s .5s ease both forwards"/>'
      +xs.map(function(x,i){return '<circle cx="'+x+'" cy="'+ys[i]+'" r="0" fill="#020c06" stroke="#4ade80" stroke-width="2.5" style="cursor:pointer;animation:dotPop .4s '+(.5+i*.1)+'s ease both forwards" onmouseenter="dShowTip(event,\''+meses[i].label+'\',\'R$'+brl(meses[i].repasse)+'\')" onmouseleave="dHideTip()"/>';}).join('');
    document.getElementById('dash-xaxis').innerHTML=meses.map(function(m){return '<span>'+m.label+'</span>';}).join('');
  } else {
    svg.innerHTML='<text x="120" y="44" text-anchor="middle" font-size="11" fill="rgba(255,255,255,.2)">Apenas 1 mês</text>';
  }
  if(window.THREE)setTimeout(function(){initDsh3D(meses);},80);
}
function dShowTip(e,mes,val){
  var tip=document.getElementById('dash-ltip');
  var wr=e.target.closest('.dsh-lwrap').getBoundingClientRect();
  tip.innerHTML='<b style="color:#4ade80">'+mes+'</b> '+val;
  tip.style.left=((e.clientX-wr.left)/wr.width*100)+'%';
  tip.style.top=(e.clientY-wr.top-10)+'px';
  tip.style.opacity='1';
}
function dHideTip(){document.getElementById('dash-ltip').style.opacity='0';}

function imprimirComp(){
  document.title=`AunordMED - Comprovante #${pad(numSeq)} - ${comp?.medico_nome||''}`;
  window.print();
  setTimeout(()=>{document.title='AunordMED — Comprovante de Repasse';},1000);
}

async function enviarWhatsApp(){
  const tel=medico?.telefone_whatsapp||medico?.telefone;
  if(!tel){toast('Médico sem WhatsApp cadastrado.','err');return;}
  const link=window.location.href;
  const msgPadrao=`🏥 *AunordMED Financeiro*\n\nOlá, Dr(a). *${comp.medico_nome}*!\n\nSeu comprovante de repasse *#${pad(numSeq)}* referente à competência *${fmtMes(comp.competencia)}* está disponível.\n\n💰 *Valor:* R$ ${brl(comp.valor_repasse)}\n📅 *Data:* ${fmtDt(comp.data_pagamento)}\n🏢 *Tomador:* ${comp.tomador||'—'}\n\n📄 Acesse seu comprovante:\n${link}\n\n_AunordMED — Gestão financeira médica_`;
  const msgEdit=prompt('Edite a mensagem antes de enviar:',msgPadrao);
  if(msgEdit===null)return;
  if(cfg.wppUrl&&cfg.wppKey){
    try{
      const r=await fetch(`${cfg.wppUrl}/message/sendText/${cfg.wppInst}`,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.wppKey},body:JSON.stringify({number:tel,text:msgEdit,delay:1000})});
      if(r.ok)toast('WhatsApp enviado!','wpp');
      else throw new Error();
    }catch{window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msgEdit)}`,'_blank');}
  }else{
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msgEdit)}`,'_blank');
    toast('Abrindo WhatsApp…','wpp');
  }
}

init();
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</body>
</html>
