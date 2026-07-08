#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Converte um modelo 3D (GLB/OBJ/STL/PLY) em .3MF pronto para impressão,
com opção de texto em relevo nas costas ("POLÍCIA MILITAR").

Uso:
  python3 converter_para_3mf.py modelo.glb saida.3mf [altura_mm] [texto]

  altura_mm  — altura final do boneco (padrão: 180)
  texto      — texto em relevo nas costas; use "" para desativar
               (padrão: "POLÍCIA|MILITAR", "|" quebra linha)

O texto é posicionado automaticamente na face de trás (-Y) do modelo,
centralizado na região do tronco, penetrando 1 mm na malha para que o
fatiador solde as peças.
"""
import sys

import numpy as np
import trimesh
from matplotlib.font_manager import FontProperties
from matplotlib.textpath import TextPath
from shapely.geometry import Polygon
from shapely.ops import unary_union

RELEVO = 1.2    # mm — saliência do texto
EMBUTIR = 1.0   # mm — penetração do texto na malha


def poligonos_do_texto(texto: str) -> list[Polygon]:
    fonte = FontProperties(family="DejaVu Sans", weight="bold")
    caminho = TextPath((0, 0), texto, size=100, prop=fonte)
    forma = None
    for pts in caminho.to_polygons():
        if len(pts) < 3:
            continue
        anel = Polygon(pts).buffer(0)
        forma = anel if forma is None else forma.symmetric_difference(anel)
    forma = forma.buffer(0)
    return list(forma.geoms) if forma.geom_type == "MultiPolygon" else [forma]


def malha_texto(linhas: list[str], largura: float) -> trimesh.Trimesh:
    """Texto extrudado no plano XZ, apontando para -Y, centrado na origem."""
    blocos = []
    alt_linha = largura * 0.22
    y0 = (len(linhas) - 1) * alt_linha / 2.0
    for i, linha in enumerate(linhas):
        polys = poligonos_do_texto(linha)
        minx, miny, maxx, maxy = unary_union(polys).bounds
        esc = largura / (maxx - minx)
        dx, dy = -(minx + maxx) / 2, -(miny + maxy) / 2
        for p in polys:
            m = trimesh.creation.extrude_polygon(p, height=RELEVO + EMBUTIR)
            m.apply_translation([dx, dy, 0])
            m.apply_scale([esc, esc, 1.0])
            m.apply_translation([0, y0 - i * alt_linha, 0])
            blocos.append(m)
    texto = trimesh.util.concatenate(blocos)
    # extrusão é em +Z; girar para a face das costas (-Y do modelo)
    texto.apply_transform(trimesh.transformations.rotation_matrix(
        np.pi / 2, [1, 0, 0]))          # agora o relevo aponta para -Y
    return texto


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    entrada, saida = sys.argv[1], sys.argv[2]
    altura_mm = float(sys.argv[3]) if len(sys.argv) > 3 else 180.0
    texto_arg = sys.argv[4] if len(sys.argv) > 4 else "POLÍCIA|MILITAR"

    cena = trimesh.load(entrada, force="scene")
    modelo = trimesh.util.concatenate(list(cena.geometry.values()))
    modelo.merge_vertices()

    # orientar Z para cima se o arquivo vier Y-up (GLB costuma vir)
    ext = modelo.extents
    if entrada.lower().endswith((".glb", ".gltf")) and ext[1] > ext[2]:
        modelo.apply_transform(trimesh.transformations.rotation_matrix(
            np.pi / 2, [1, 0, 0]))

    # escalar para a altura desejada e apoiar no plano Z=0, centrado em XY
    modelo.apply_scale(altura_mm / modelo.extents[2])
    minb, maxb = modelo.bounds
    modelo.apply_translation([-(minb[0] + maxb[0]) / 2,
                              -(minb[1] + maxb[1]) / 2, -minb[2]])
    print(f"modelo: {len(modelo.faces)} faces, "
          f"{modelo.extents.round(1).tolist()} mm, "
          f"estanque={modelo.is_watertight}")

    objetos = [(modelo, "Modelo", "#8A8A8A")]
    if texto_arg:
        linhas = texto_arg.split("|")
        larg = modelo.extents[0] * 0.55           # 55% da largura do modelo
        txt = malha_texto(linhas, larg)
        # posição: costas = Y mínimo na faixa do tronco (55–75% da altura)
        alt = modelo.extents[2]
        faixa = modelo.vertices[(modelo.vertices[:, 2] > 0.55 * alt)
                                & (modelo.vertices[:, 2] < 0.75 * alt)]
        y_costas = faixa[:, 1].max() if len(faixa) else modelo.bounds[1][1]
        z_centro = 0.65 * alt
        txt.apply_translation([0, y_costas - EMBUTIR + (RELEVO + EMBUTIR), z_centro])
        print(f"texto nas costas: y={y_costas:.1f} z={z_centro:.1f} larg={larg:.1f}mm")
        objetos.append((txt, "Texto POLÍCIA MILITAR (amarelo)", "#FFD500"))

    from gerar_emblema import escrever_3mf
    escrever_3mf(saida, objetos)
    print(f"gerado: {saida}")


if __name__ == "__main__":
    main()
