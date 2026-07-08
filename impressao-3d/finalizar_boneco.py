#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Finaliza o boneco do policial para impressão 3D:
- corpo sólido reconstruído (corpo-final.ply, gerado a partir do GLB do Tripo/IA)
- texto "POLÍCIA MILITAR" em relevo nas costas do colete
- base elíptica de apoio
- exporta .3MF colorido (corpo + base + letras)

Uso: python3 finalizar_boneco.py [saida.3mf] [--sem-texto]
"""
import sys

import numpy as np
import trimesh
from shapely.geometry import Point

from converter_para_3mf import malha_texto
from gerar_emblema import escrever_3mf

TEXTO_LARG = 46.0        # mm — largura de cada linha do texto
TEXTO_Z = 126.0          # mm — centro vertical do texto (costas do colete)
RELEVO = 1.2             # mm — saliência mínima das letras
COR_CORPO = "#A69770"    # cáqui
COR_LETRA = "#FFD500"    # amarelo
COR_BASE = "#3A3A3A"     # grafite


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    com_texto = "--sem-texto" not in sys.argv
    saida = args[0] if args else "boneco-policia-militar.3mf"
    corpo = trimesh.load("corpo-final.ply")

    letras = None
    if com_texto:
        letras = gerar_letras(corpo)

    # ---- base elíptica sob os pés
    pes = corpo.vertices[corpo.vertices[:, 2] < 6.0]
    cx, cy = pes[:, 0].mean(), pes[:, 1].mean()
    rx = (pes[:, 0].max() - pes[:, 0].min()) / 2 + 10
    ry = (pes[:, 1].max() - pes[:, 1].min()) / 2 + 10
    elipse = Point(0, 0).buffer(1.0, quad_segs=24)
    elipse = trimesh.creation.extrude_polygon(elipse, height=4.0)
    elipse.apply_scale([rx, ry, 1.0])
    elipse.apply_translation([cx, cy, -3.2])              # 0,8 mm dentro dos pés

    # apoiar tudo no plano z=0
    pecas = [("Policial (corpo)", corpo, COR_CORPO),
             ("Base de apoio", elipse, COR_BASE)]
    if letras is not None:
        pecas.append(("POLÍCIA MILITAR (amarelo)", letras, COR_LETRA))
    dz = -elipse.bounds[0][2]
    for nome, g, _cor in pecas:
        g.apply_translation([0, 0, dz])
        print(f"{nome}: {len(g.faces)} faces, watertight={g.is_watertight}")

    escrever_3mf(saida, [(g, nome, cor) for nome, g, cor in pecas])
    alt_total = corpo.bounds[1][2]
    print(f"gerado: {saida} — altura do boneco {alt_total:.0f} mm")


def gerar_letras(corpo: trimesh.Trimesh) -> trimesh.Trimesh:
    """Texto em relevo curvado sobre as costas do colete."""
    # ---- profundidade das costas na área do texto (ray casting de +Y p/ -Y)
    alt_texto = TEXTO_LARG * 0.22 * 2 + 4      # duas linhas + folga
    xs = np.linspace(-TEXTO_LARG / 2, TEXTO_LARG / 2, 13)
    zs = np.linspace(TEXTO_Z - alt_texto / 2, TEXTO_Z + alt_texto / 2, 9)
    origens = [[x, corpo.bounds[1][1] + 5, z] for x in xs for z in zs]
    dirs = [[0, -1, 0]] * len(origens)
    hits, idx_raio, _ = corpo.ray.intersects_location(origens, dirs, multiple_hits=False)
    ys = hits[:, 1]
    y_min, y_max = ys.min(), ys.max()
    print(f"costas na área do texto: y de {y_min:.1f} a {y_max:.1f} "
          f"(curvatura {y_max - y_min:.1f} mm)")

    # ---- letras: extrusão fina que depois é curvada sobre a superfície
    import converter_para_3mf as cv
    cv.RELEVO, cv.EMBUTIR = RELEVO, 1.0
    letras = malha_texto(["POLÍCIA", "MILITAR"], TEXTO_LARG)
    letras.apply_translation([0, 0, TEXTO_Z])
    # extrusão ocupa y em [-(RELEVO+1), 0]; deslocar cada vértice até a
    # profundidade local das costas: y_final = y + s(x,z) + RELEVO
    verts = letras.vertices.copy()
    org = np.column_stack([verts[:, 0],
                           np.full(len(verts), corpo.bounds[1][1] + 5),
                           verts[:, 2]])
    locs, iray, _ = corpo.ray.intersects_location(
        org, np.tile([0.0, -1.0, 0.0], (len(verts), 1)), multiple_hits=False)
    prof = np.full(len(verts), np.nan)
    prof[iray] = locs[:, 1]
    if np.isnan(prof).any():          # raios que erraram: vizinho mais próximo
        ok = ~np.isnan(prof)
        from scipy.spatial import cKDTree
        arvore = cKDTree(verts[ok][:, [0, 2]])
        faltam = np.where(~ok)[0]
        _, viz = arvore.query(verts[faltam][:, [0, 2]])
        prof[faltam] = prof[np.where(ok)[0][viz]]
    verts[:, 1] += prof + RELEVO
    letras.vertices = verts
    letras.fix_normals()
    return letras


if __name__ == "__main__":
    main()
