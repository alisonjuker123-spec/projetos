#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera o emblema "POLÍCIA MILITAR" (igual ao do colete) em .3MF para impressão 3D.

- Base: placa retangular preta com cantos arredondados
- Letras: "POLÍCIA" / "MILITAR" em relevo, amarelas
- Saída: arquivo .3MF com 2 objetos coloridos (pronto p/ Bambu Studio,
  OrcaSlicer, PrusaSlicer, Cura etc.)

Uso:  python3 gerar_emblema.py [saida.3mf]
"""
import io
import sys
import uuid
import zipfile

import numpy as np
import trimesh
from matplotlib.font_manager import FontProperties
from matplotlib.textpath import TextPath
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

# ---------------------------------------------------------------- parâmetros
LARGURA = 160.0      # mm — largura da placa
ALTURA = 78.0        # mm — altura da placa
ESPESSURA = 4.0      # mm — espessura da base
RAIO_CANTO = 6.0     # mm — raio dos cantos
RELEVO = 1.6         # mm — altura do relevo das letras
EMBUTIR = 0.6        # mm — quanto as letras penetram na base (p/ aderência)
LARG_TEXTO = 138.0   # mm — largura útil de cada linha de texto
COR_BASE = "#1A1A1A"
COR_LETRA = "#FFD500"
LINHAS = ["POLÍCIA", "MILITAR"]


def poligonos_do_texto(texto: str) -> list[Polygon]:
    """Converte texto em polígonos shapely (com furos), via fonte bold."""
    fonte = FontProperties(family="DejaVu Sans", weight="bold")
    caminho = TextPath((0, 0), texto, size=100, prop=fonte)
    aneis = [Polygon(p) for p in caminho.to_polygons() if len(p) >= 3]
    # preenchimento par-ímpar: XOR dos anéis reproduz os furos das letras
    forma = None
    for anel in aneis:
        anel = anel.buffer(0)
        forma = anel if forma is None else forma.symmetric_difference(anel)
    forma = forma.buffer(0)
    return list(forma.geoms) if forma.geom_type == "MultiPolygon" else [forma]


def malha_linha(texto: str, largura_alvo: float, centro_y: float) -> trimesh.Trimesh:
    """Extruda uma linha de texto, escalada p/ largura_alvo e centrada."""
    polys = poligonos_do_texto(texto)
    uniao = unary_union(polys)
    minx, miny, maxx, maxy = uniao.bounds
    escala = largura_alvo / (maxx - minx)
    dx = -(minx + maxx) / 2.0
    dy = -(miny + maxy) / 2.0
    malhas = []
    for p in polys:
        m = trimesh.creation.extrude_polygon(p, height=RELEVO + EMBUTIR)
        m.apply_translation([dx, dy, 0])
        m.apply_scale([escala, escala, 1.0])
        malhas.append(m)
    linha = trimesh.util.concatenate(malhas)
    linha.apply_translation([0, centro_y, ESPESSURA - EMBUTIR])
    return linha


def malha_base() -> trimesh.Trimesh:
    r = RAIO_CANTO
    ret = box(-LARGURA / 2 + r, -ALTURA / 2 + r, LARGURA / 2 - r, ALTURA / 2 - r)
    arred = ret.buffer(r, quad_segs=16)
    m = trimesh.creation.extrude_polygon(arred, height=ESPESSURA)
    return m


def escrever_3mf(caminho: str, objetos: list[tuple[trimesh.Trimesh, str, str]]):
    """Escreve um .3MF mínimo com basematerials (cores) — spec core 3MF."""
    ns = 'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"'
    partes = [f'<?xml version="1.0" encoding="UTF-8"?>\n'
              f'<model unit="millimeter" xml:lang="en-US" {ns}>\n'
              f' <resources>\n  <basematerials id="1">\n']
    for _, nome, cor in objetos:
        partes.append(f'   <base name="{nome}" displaycolor="{cor}FF" />\n')
    partes.append('  </basematerials>\n')
    for i, (malha, nome, _) in enumerate(objetos):
        oid = i + 2
        partes.append(f'  <object id="{oid}" name="{nome}" type="model" '
                      f'pid="1" pindex="{i}">\n   <mesh>\n    <vertices>\n')
        for v in malha.vertices:
            partes.append(f'     <vertex x="{v[0]:.4f}" y="{v[1]:.4f}" z="{v[2]:.4f}" />\n')
        partes.append('    </vertices>\n    <triangles>\n')
        for t in malha.faces:
            partes.append(f'     <triangle v1="{t[0]}" v2="{t[1]}" v3="{t[2]}" />\n')
        partes.append('    </triangles>\n   </mesh>\n  </object>\n')
    partes.append(' </resources>\n <build>\n')
    for i in range(len(objetos)):
        partes.append(f'  <item objectid="{i + 2}" />\n')
    partes.append(' </build>\n</model>\n')
    modelo = "".join(partes)

    tipos = ('<?xml version="1.0" encoding="UTF-8"?>\n'
             '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n'
             ' <Default Extension="rels" ContentType='
             '"application/vnd.openxmlformats-package.relationships+xml" />\n'
             ' <Default Extension="model" ContentType='
             '"application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />\n'
             '</Types>\n')
    rels = ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
            f' <Relationship Target="/3D/3dmodel.model" Id="rel-{uuid.uuid4().hex[:8]}" '
            'Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />\n'
            '</Relationships>\n')
    with zipfile.ZipFile(caminho, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", tipos)
        z.writestr("_rels/.rels", rels)
        z.writestr("3D/3dmodel.model", modelo)


def main():
    saida = sys.argv[1] if len(sys.argv) > 1 else "emblema-policia-militar.3mf"
    base = malha_base()
    # duas linhas centradas verticalmente, como na foto
    alt_linha = 26.0
    folga = 6.0
    y_sup = (alt_linha + folga) / 2.0
    letras = trimesh.util.concatenate([
        malha_linha(LINHAS[0], LARG_TEXTO, y_sup),
        malha_linha(LINHAS[1], LARG_TEXTO, -y_sup),
    ])
    for nome, m in (("base", base), ("letras", letras)):
        m.merge_vertices()
        m.fix_normals()
        print(f"{nome}: {len(m.vertices)} vértices, {len(m.faces)} faces, "
              f"estanque={m.is_watertight}, volume={m.volume:.0f} mm³")
    escrever_3mf(saida, [(base, "Base (preto)", COR_BASE),
                         (letras, "Letras POLÍCIA MILITAR (amarelo)", COR_LETRA)])
    print(f"gerado: {saida}")
    print(f"dimensões: {LARGURA:.0f} x {ALTURA:.0f} x {ESPESSURA + RELEVO:.1f} mm")


if __name__ == "__main__":
    main()
