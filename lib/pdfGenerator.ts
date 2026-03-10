/**
 * Gerador de Documentos PDF — sesmtconnect
 *
 * Gera documentos com validade jurídica conforme:
 * - NR-06 (Equipamento de Proteção Individual)
 * - CLT Art. 166 e 167 (obrigatoriedade de fornecimento de EPI)
 * - Portaria MTE/SIT nº 25/2001 e atualizações
 * - Lei 13.709/2018 (LGPD) — nota de privacidade
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Worker, Delivery, InventoryItem } from './data';

// ─── Cores e Constantes ──────────────────────────────────────────────────────
const BRAND_BLUE = [18, 65, 161] as [number, number, number];   // #1241a1
const SLATE_900 = [15, 23, 42] as [number, number, number];
const SLATE_500 = [100, 116, 139] as [number, number, number];
const SLATE_100 = [241, 245, 249] as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];
const RED_600 = [220, 38, 38] as [number, number, number];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function addPageBorder(doc: jsPDF) {
    doc.setDrawColor(18, 65, 161);
    doc.setLineWidth(0.8);
    doc.rect(10, 10, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 20);
}

function addHeader(doc: jsPDF, title: string, subtitle: string) {
    const W = doc.internal.pageSize.width;

    // Barra azul superior
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(10, 10, W - 20, 22, 'F');

    // Título principal
    doc.setTextColor(...WHITE);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title, W / 2, 20, { align: 'center' });

    // Sub-título
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, W / 2, 26, { align: 'center' });

    // Número NR e CLT
    doc.setFontSize(7);
    doc.text('NR-06 | CLT Art. 166/167 | Portaria MTE/SIT 25/2001', W / 2, 30, { align: 'center' });
}

function addFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
    const W = doc.internal.pageSize.width;
    const H = doc.internal.pageSize.height;

    doc.setFillColor(...SLATE_100);
    doc.rect(10, H - 20, W - 20, 10, 'F');

    doc.setTextColor(...SLATE_500);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');

    const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.text(`Documento gerado em: ${dateStr} | Sistema de Gestão EPI — sesmtconnect`, W / 2, H - 13, { align: 'center' });
    doc.text(`Página ${pageNumber} de ${totalPages}`, W - 14, H - 13, { align: 'right' });

    // Nota LGPD
    doc.text('Dados protegidos conforme Lei 13.709/2018 (LGPD)', 14, H - 13);
}

function sectionTitle(doc: jsPDF, y: number, text: string): number {
    const W = doc.internal.pageSize.width;
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(14, y, W - 28, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(text.toUpperCase(), 17, y + 5);
    return y + 10;
}

function labelValue(doc: jsPDF, x: number, y: number, label: string, value: string, w = 80) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SLATE_500);
    doc.text(label + ':', x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE_900);
    doc.text(value || '—', x + w * 0.38, y);
}

// ─── Ficha de EPI (NR-06) ────────────────────────────────────────────────────
export function gerarFichaEPI(
    worker: Worker,
    deliveries: Delivery[],
    responsible: string = 'Responsável SST',
    companyName: string = 'Empresa',
) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.width;
    let y = 36;

    addPageBorder(doc);
    addHeader(
        doc,
        'FICHA DE REGISTRO DE ENTREGA DE EPI',
        `${companyName} — Controle de Equipamentos de Proteção Individual`
    );

    // ── 1. Aviso de controle e numeração ─────────────────────────────────────
    doc.setTextColor(...SLATE_500);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    const docNum = `FE-${worker.reg?.replace('#', '')}-${new Date().getFullYear()}-${String(deliveries.length).padStart(3, '0')}`;
    doc.text(`Nº do Documento: ${docNum}`, W - 14, y, { align: 'right' });
    doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, y);
    y += 7;

    // ── 2. Dados do Trabalhador ───────────────────────────────────────────────
    y = sectionTitle(doc, y, '1. Identificação do Trabalhador');
    const half = (W - 28) / 2;
    labelValue(doc, 14, y + 4, 'Nome Completo', worker.name, half);
    labelValue(doc, 14 + half + 2, y + 4, 'CPF', worker.cpf, half);
    labelValue(doc, 14, y + 10, 'Matrícula', worker.reg, half);
    labelValue(doc, 14 + half + 2, y + 10, 'Cargo / Função', worker.role, half);
    labelValue(doc, 14, y + 16, 'Departamento / Setor', worker.dept, half);
    labelValue(doc, 14 + half + 2, y + 16, 'Situação', worker.status, half);
    y += 24;

    // ── 3. Riscos Identificados ───────────────────────────────────────────────
    y = sectionTitle(doc, y, '2. Riscos Ocupacionais Identificados (PPRA / PGR / LTCAT)');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE_900);
    const risksText = worker.risks.length > 0
        ? worker.risks.join(' | ')
        : 'Nenhum risco identificado no momento da emissão.';
    doc.text(risksText, 14, y + 5, { maxWidth: W - 28 });
    y += 12;

    // ── 4. Tabela de Entregas ─────────────────────────────────────────────────
    y = sectionTitle(doc, y, '3. Registro de Entrega / Devolução de EPIs');

    // Aviso NR-06 § 6.6.1
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE_500);
    doc.setFont('helvetica', 'italic');
    doc.text(
        'Conforme NR-06, item 6.6.1, o empregador é obrigado a fornecer ao trabalhador somente EPI aprovado pelo órgão nacional competente em matéria de segurança e saúde no trabalho.',
        14, y, { maxWidth: W - 28 }
    );
    y += 8;

    const tableRows = deliveries.map((d, idx) => [
        String(idx + 1).padStart(2, '0'),
        d.itemName,
        d.ca || '—',
        d.qty,
        d.date,
        d.status === 'Devolvido' ? d.date : '—',
        d.responsible,
        d.status,
    ]);

    autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [['#', 'Descrição do EPI', 'Nº CA', 'Qtd', 'Dt. Entrega', 'Dt. Devolução', 'Responsável', 'Status']],
        body: tableRows,
        styles: { fontSize: 7, cellPadding: 2.5, textColor: SLATE_900 },
        headStyles: { fillColor: BRAND_BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 7, halign: 'center' },
            1: { cellWidth: 50 },
            2: { cellWidth: 15, halign: 'center' },
            3: { cellWidth: 12, halign: 'center' },
            4: { cellWidth: 22, halign: 'center' },
            5: { cellWidth: 22, halign: 'center' },
            6: { cellWidth: 30 },
            7: { cellWidth: 18, halign: 'center' },
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 7) {
                const status = data.cell.raw as string;
                if (status === 'Em Uso') data.cell.styles.textColor = [29, 78, 216];
                if (status === 'Vencendo') data.cell.styles.textColor = [161, 98, 7];
                if (status === 'Devolvido') data.cell.styles.textColor = [71, 85, 105];
            }
        },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;

    // ── 5. Termo de Responsabilidade ─────────────────────────────────────────
    if (y > 220) { doc.addPage(); addPageBorder(doc); y = 20; }

    y = sectionTitle(doc, y, '4. Termo de Ciência e Responsabilidade do Trabalhador');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE_900);

    const termo = [
        'Declaro que recebi os Equipamentos de Proteção Individual (EPIs) relacionados nesta Ficha, que fui devidamente',
        'orientado e treinado para sua correta utilização, guarda e conservação, conforme as instruções do fabricante.',
        '',
        'Estou ciente de que:',
        '  (a) A não utilização dos EPIs poderá ocasionar acidentes do trabalho, doenças ocupacionais e sanções disciplinares;',
        '  (b) Devo zelar pela conservação dos EPIs, comunicando imediatamente qualquer defeito, dano ou extravio;',
        '  (c) Estou obrigado a devolver os EPIs ao término do contrato de trabalho ou quando solicitado pelo empregador;',
        '  (d) A empresa tomará as providências cabíveis em caso de descumprimento (NR-06, item 6.7.1 a 6.7.3);',
        '  (e) Os dados pessoais constantes neste documento são tratados conforme a LGPD (Lei 13.709/2018).',
    ];

    termo.forEach((line) => {
        doc.text(line, 14, y);
        y += 4.5;
    });

    y += 6;

    // ── 6. Campos de Assinatura ───────────────────────────────────────────────
    if (y > 250) { doc.addPage(); addPageBorder(doc); y = 20; }

    y = sectionTitle(doc, y, '5. Assinaturas');
    y += 4;

    // Colunas de assinatura
    const colW = (W - 28) / 3;

    const drawSignBlock = (x: number, labelTop: string, labelBottom: string) => {
        // Linha de assinatura
        doc.setDrawColor(...SLATE_500);
        doc.setLineWidth(0.3);
        doc.line(x + 5, y + 20, x + colW - 5, y + 20);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...SLATE_900);
        doc.text(labelTop, x + colW / 2, y + 25, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...SLATE_500);
        doc.text(labelBottom, x + colW / 2, y + 30, { align: 'center' });
    };

    drawSignBlock(14, worker.name, 'Trabalhador — Assinatura e Data');
    drawSignBlock(14 + colW, responsible, 'Responsável SST / Empregador');
    drawSignBlock(14 + colW * 2, 'Testemunha', 'Nome e Assinatura');

    y += 36;

    // ── 7. Observações e Base Legal ───────────────────────────────────────────
    if (y > 265) { doc.addPage(); addPageBorder(doc); y = 20; }

    doc.setFillColor(...SLATE_100);
    doc.rect(14, y, W - 28, 18, 'F');
    doc.setTextColor(...SLATE_500);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('BASE LEGAL:', 17, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(
        'NR-06 (Portaria MTb nº 3.214/1978, atualizada pela Portaria MTE/SIT nº 25/2001 e demais alterações) | CLT Arts. 166 e 167 | Lei 8.213/1991 (acidentes do trabalho) | Lei 13.709/2018 (LGPD)',
        17, y + 10, { maxWidth: W - 32 }
    );
    doc.text(
        'Este documento possui validade jurídica como comprovante de fornecimento de EPI e ciência do trabalhador quanto às normas de segurança.',
        17, y + 15, { maxWidth: W - 32 }
    );

    y += 22;

    // ── 8. Nota de Alerta ─────────────────────────────────────────────────────
    doc.setTextColor(...RED_600);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠ DOCUMENTO CONTROLADO — Manter em arquivo por no mínimo 20 anos (NR-06 e Resolução CFM 1.821/2007)', W / 2, y + 4, { align: 'center' });

    // ── Paginação ─────────────────────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(doc, i, totalPages);
    }

    doc.save(`Ficha_EPI_${worker.name.replace(/\s+/g, '_')}_${worker.reg?.replace('#', '')}.pdf`);
}

// ─── Relatório de Inventário ──────────────────────────────────────────────────
export function gerarRelatorioInventario(
    inventory: InventoryItem[],
    companyName: string = 'Empresa',
) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.width;
    let y = 36;

    addPageBorder(doc);
    addHeader(
        doc,
        'RELATÓRIO DE INVENTÁRIO DE EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL',
        `${companyName} — Controle de Estoque conforme NR-06`
    );

    // Número e data
    doc.setTextColor(...SLATE_500);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    const relNum = `REL-INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    doc.text(`Nº Relatório: ${relNum}`, W - 14, y, { align: 'right' });
    doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, y);
    y += 7;

    // ── Resumo Executivo ───────────────────────────────────────────────────────
    y = sectionTitle(doc, y, '1. Resumo Executivo do Estoque');

    const totalItens = inventory.length;
    const criticos = inventory.filter(i => i.status === 'Reposição Necessária').length;
    const estoqueOk = inventory.filter(i => i.status === 'Estoque OK').length;

    const cols3 = (W - 28) / 3;

    const kpiBlock = (x: number, val: string, label: string, color: [number, number, number]) => {
        doc.setFillColor(...color);
        doc.rect(x, y, cols3 - 3, 14, 'F');
        doc.setTextColor(...WHITE);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(val, x + (cols3 - 3) / 2, y + 8, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(label, x + (cols3 - 3) / 2, y + 12.5, { align: 'center' });
    };

    kpiBlock(14, String(totalItens), 'TOTAL DE ITENS', BRAND_BLUE);
    kpiBlock(14 + cols3, String(estoqueOk), 'ESTOQUE OK', [4, 120, 87]);
    kpiBlock(14 + cols3 * 2, String(criticos), 'REPOSIÇÃO NECESSÁRIA', RED_600);

    y += 20;

    // ── Tabela Completa ────────────────────────────────────────────────────────
    y = sectionTitle(doc, y, '2. Listagem Detalhada do Inventário de EPI');

    const tableRows = inventory.map((item, idx) => [
        String(idx + 1).padStart(2, '0'),
        item.name,
        item.ca || '—',
        item.category,
        String(item.stock),
        String(item.minStock),
        item.unit,
        item.status,
    ]);

    autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [['#', 'Descrição do EPI / Material', 'Nº CA', 'Categoria', 'Estoque Atual', 'Estoque Mínimo', 'Unidade', 'Status']],
        body: tableRows,
        styles: { fontSize: 7.5, cellPadding: 2.8, textColor: SLATE_900 },
        headStyles: { fillColor: BRAND_BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 70 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 40 },
            4: { cellWidth: 22, halign: 'center' },
            5: { cellWidth: 22, halign: 'center' },
            6: { cellWidth: 18, halign: 'center' },
            7: { cellWidth: 32, halign: 'center' },
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 7) {
                const status = data.cell.raw as string;
                if (status === 'Estoque OK') {
                    data.cell.styles.textColor = [4, 120, 87];
                    data.cell.styles.fontStyle = 'bold';
                }
                if (status === 'Reposição Necessária') {
                    data.cell.styles.textColor = RED_600;
                    data.cell.styles.fontStyle = 'bold';
                }
            }
            if (data.section === 'body' && data.column.index === 4) {
                const item = inventory[data.row.index];
                if (item && item.stock <= item.minStock) {
                    data.cell.styles.textColor = RED_600;
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;

    // ── Nota Base Legal ────────────────────────────────────────────────────────
    if (y < doc.internal.pageSize.height - 40) {
        doc.setFillColor(...SLATE_100);
        doc.rect(14, y, W - 28, 14, 'F');
        doc.setTextColor(...SLATE_500);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.text('BASE LEGAL:', 17, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.text(
            'NR-06 (Equipamentos de Proteção Individual) | CLT Arts. 166/167 | Lei 6.514/1977 | LGPD (Lei 13.709/2018)',
            17, y + 10, { maxWidth: W - 32 }
        );
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(doc, i, totalPages);
    }

    doc.save(`Relatorio_Inventario_EPI_${new Date().toISOString().split('T')[0]}.pdf`);
}
