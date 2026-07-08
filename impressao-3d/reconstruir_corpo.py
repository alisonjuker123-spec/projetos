#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Reconstrói o corpo sólido imprimível (corpo-final.ply) a partir do GLB
gerado pela IA (boneco-tripo.glb, que contém DOIS bonecos lado a lado).

Etapas: seleciona o boneco da direita → orienta em pé (Z p/ cima) →
escala p/ 180 mm → voxeliza (0,45 mm) e preenche o interior →
marching cubes → suavização Taubin → simplificação → maior componente.

Uso: python3 reconstruir_corpo.py
"""
import fast_simplification
import numpy as np
import trimesh
import trimesh.smoothing as sm

ALTURA = 180.0   # mm
PITCH = 0.45     # mm — resolução da reconstrução

m = trimesh.util.concatenate(
    list(trimesh.load("boneco-tripo.glb", force="scene").geometry.values()))
comps = m.split(only_watertight=False)
fig = trimesh.util.concatenate([c for c in comps if c.centroid[0] >= 0])
fig.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))

fig.apply_scale(ALTURA / fig.extents[2])
mn, mx = fig.bounds
fig.apply_translation([-(mn[0] + mx[0]) / 2, -(mn[1] + mx[1]) / 2, -mn[2]])

solido = fig.voxelized(PITCH).fill().marching_cubes
solido.apply_scale(PITCH)
solido.apply_translation(fig.bounds[0] - solido.bounds[0])
print("marching cubes:", len(solido.faces), "faces, watertight:", solido.is_watertight)

sm.filter_taubin(solido, lamb=0.5, nu=-0.53, iterations=12)

v, f = fast_simplification.simplify(solido.vertices.astype(np.float32),
                                    solido.faces.astype(np.int64),
                                    target_reduction=0.75)
simp = trimesh.Trimesh(v, f)
simp.update_faces(simp.nondegenerate_faces())
simp.merge_vertices()
simp.fix_normals()
trimesh.repair.fill_holes(simp)
corpo = max(simp.split(only_watertight=False), key=lambda c: len(c.faces))
print("corpo final:", len(corpo.faces), "faces, watertight:", corpo.is_watertight)
corpo.export("corpo-final.ply")
