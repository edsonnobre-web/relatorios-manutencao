
/* V8.8 — refinamento visual profissional do PDF.
   Este arquivo altera SOMENTE o documento de relatório/PDF. */
(function(){
  const css = String.raw`
/* ===== PÁGINA / ÁREA ÚTIL ===== */
@page{
  size:A4 portrait!important;
  margin:7mm 7mm 12mm 7mm!important;
}
.reportPaper{
  width:196mm!important;
  min-height:278mm!important;
  padding:0!important;
  margin:0 auto!important;
  overflow:visible!important;
  font-size:9pt!important;
  line-height:1.28!important;
}
.reportContent{
  width:100%!important;
  padding:0!important;
}

/* ===== CABEÇALHO MAIS COMPACTO ===== */
.pdfHead{
  grid-template-columns:30mm 1fr 38mm!important;
  min-height:22mm!important;
  margin:0 0 4mm!important;
  border:.65px solid #111!important;
  border-radius:1.2mm!important;
  overflow:hidden!important;
}
.pdfLogo{
  padding:1.5mm!important;
  border-right:.65px solid #111!important;
}
.pdfLogo img{
  max-width:25mm!important;
  max-height:17mm!important;
}
.pdfTitle{
  padding:1.5mm 2mm!important;
  font-size:10.2pt!important;
  line-height:1.22!important;
}
.pdfMeta{
  padding:1.8mm!important;
  font-size:8pt!important;
  line-height:1.3!important;
  border-left:.65px solid #111!important;
}
.pdfStatusSeal{
  margin-top:1mm!important;
  padding:.7mm 1mm!important;
  border:.65px solid #444!important;
  font-size:7.3pt!important;
}

/* ===== SEÇÕES: MENOS ESPAÇO E MENOS "CAIXA" ===== */
.pdfSectionTitle{
  text-align:left!important;
  color:#001f8f!important;
  font-size:9.2pt!important;
  letter-spacing:.25px!important;
  margin:4mm 0 1.2mm!important;
  padding:0 0 .8mm!important;
  border-bottom:1.2px solid #001f8f!important;
  background:transparent!important;
}
.pdfTable{
  margin:0 0 1.5mm!important;
  font-size:8.5pt!important;
}
.pdfTable td,.pdfTable th{
  border:.55px solid #697386!important;
  padding:1.35mm 1.6mm!important;
  line-height:1.25!important;
}
.pdfText{
  min-height:9mm!important;
  border:.55px solid #8a94a6!important;
  border-radius:.8mm!important;
  padding:1.7mm 2mm!important;
  line-height:1.32!important;
  text-align:left!important;
}

/* ===== FOTOS ===== */
.pdfPhotos td{
  border:.55px solid #8a94a6!important;
  padding:1.2mm!important;
}
.pdfPhotos img{
  height:56mm!important;
  border-radius:.8mm!important;
}
.pdfCaption{
  font-size:7.5pt!important;
  line-height:1.25!important;
  margin-top:.8mm!important;
}

/* ===== ASSINATURAS MAIS LEVES ===== */
.pdfSignSection{
  margin-top:3mm!important;
}
.pdfSignCards{
  gap:4mm!important;
  margin-top:1mm!important;
}
.pdfSignCard{
  min-height:36mm!important;
  padding:1mm 2mm!important;
  border:0!important;
  outline:0!important;
}
.pdfSignRole{
  margin-bottom:1mm!important;
  font-size:7.3pt!important;
}
.pdfSignSpace{
  height:21mm!important;
}
.pdfSignImgCard{
  height:21mm!important;
  max-width:88%!important;
}
.pdfSignLine{
  margin:.8mm 7mm .7mm!important;
  border-top:.7px solid #222!important;
}
.pdfSignName{font-size:8.2pt!important}
.pdfSignMeta{font-size:7.2pt!important}

/* ===== APROVAÇÃO / QR ===== */
.pdfApproval{
  margin-top:4mm!important;
  padding:2mm!important;
  border:.7px solid #697386!important;
  border-radius:1mm!important;
  font-size:8pt!important;
  line-height:1.35!important;
}
.pdfEndBlock{
  margin-top:8mm!important;
}
.pdfQr{
  margin-top:4mm!important;
  padding:1.6mm!important;
  gap:5mm!important;
  border:.55px solid #8a94a6!important;
  border-radius:1mm!important;
  font-size:7.5pt!important;
}
.qrBox{
  width:19mm!important;
  height:19mm!important;
  border:.55px solid #697386!important;
  font-size:6.5pt!important;
}

/* ===== RODAPÉ ===== */
.pdfFooter{
  margin-top:5mm!important;
  padding:2mm 0 0!important;
  border-top:.55px solid #a7afbd!important;
  font-size:7pt!important;
  line-height:1.3!important;
  color:#4b5563!important;
}

/* ===== MARCA D'ÁGUA MAIS DISCRETA ===== */
.pdfWmText{
  width:155mm!important;
  font-size:23pt!important;
  color:rgba(0,31,143,.085)!important;
}
.pdfWmStatus{
  width:155mm!important;
  font-size:34pt!important;
}
.pdfWmStatus.wm-draft{color:rgba(0,55,150,.10)!important}
.pdfWmStatus.wm-wait{color:rgba(190,100,0,.11)!important}
.pdfWmStatus.wm-corr{color:rgba(180,130,0,.12)!important}
.pdfWmStatus.wm-ok{color:rgba(0,130,45,.12)!important}
.pdfWmStatus.wm-bad{color:rgba(180,0,0,.13)!important}

/* ===== QUEBRAS DE PÁGINA ===== */
.pdfHead,.pdfTable,.pdfApproval,.pdfQr,.pdfSignSection{
  break-inside:avoid!important;
  page-break-inside:avoid!important;
}
.pdfSectionTitle{
  break-after:avoid!important;
  page-break-after:avoid!important;
}
.pdfFinalBlock{
  margin-top:3mm!important;
  padding-top:0!important;
}
.pdfEndBlock{
  break-inside:avoid!important;
  page-break-inside:avoid!important;
}

/* ===== IMPRESSÃO ===== */
@media print{
  html,body{
    margin:0!important;
    padding:0!important;
    background:#fff!important;
  }
  .reportPaper{
    width:196mm!important;
    min-height:0!important;
    padding:0!important;
    margin:0 auto!important;
  }
  .pdfViewerActions{display:none!important}
}
`;
  window.REPORT_APP_CSS = (window.REPORT_APP_CSS || '') + '\n' + css;
})();
