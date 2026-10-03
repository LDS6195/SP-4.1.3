import * as THREE from 'three';
import { companyLogoAccent } from '../data/companyLogo.js';

export function createCompanyEmblem(company, texture) {
  const group = new THREE.Group();
  group.name = 'raised-company-emblem';
  if (company.logoStyle === 'seal') {
    const accent = company.logoAccent ?? companyLogoAccent(company.acronym, company.name);
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 1.31, 0, Math.PI * 2, false);
    const backing = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: .16, bevelEnabled: true, bevelSize: .035, bevelThickness: .025, bevelSegments: 3, curveSegments: 64 }),
      new THREE.MeshStandardMaterial({ color: accent, metalness: .7, roughness: .3 }),
    );
    backing.castShadow = true;
    backing.receiveShadow = true;
    group.add(backing);
  }
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(2.7, 2.7),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .05, toneMapped: false }),
  );
  face.position.z = .192;
  group.add(face);
  return group;
}

export function createWallPainting(texture) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.62, 2.22, .12),
    new THREE.MeshStandardMaterial({ color: '#282426', roughness: .6, metalness: .25 }),
  );
  frame.castShadow = true;
  group.add(frame);
  const mat = new THREE.Mesh(new THREE.BoxGeometry(1.48, 2.08, .025), new THREE.MeshStandardMaterial({ color: '#e8e9e4', roughness: .8 }));
  mat.position.z = .072;
  group.add(mat);
  const image = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 1.94), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  image.position.z = .09;
  group.add(image);
  return group;
}

export function createFinanceDeskProps(ticketTexture) {
  const group = new THREE.Group();
  group.name = 'desk-finance-tickets-cash-calculator';
  const green = new THREE.MeshStandardMaterial({ color: '#547d61', roughness: .8 });
  const band = new THREE.MeshStandardMaterial({ color: '#e1e3d5', roughness: .9 });
  const dark = new THREE.MeshStandardMaterial({ color: '#24292c', roughness: .6 });
  const key = new THREE.MeshStandardMaterial({ color: '#adb6b8', roughness: .55 });
  const part = (width, height, depth, material, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  [-.2, 0, .2].forEach((offset, index) => {
    const ticket = new THREE.Mesh(new THREE.PlaneGeometry(.36, .16), new THREE.MeshBasicMaterial({ map: ticketTexture, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
    ticket.position.set(offset, index * .008, index * .02);
    ticket.rotation.x = -Math.PI / 2;
    ticket.rotation.z = (index - 1) * .08;
    group.add(ticket);
  });
  for (let stack = 0; stack < 3; stack += 1) {
    const x = -.29 + stack * .21;
    const z = -.4 - stack * .035;
    part(.34, .055, .17, green, x, .02 + stack * .008, z);
    part(.04, .059, .174, band, x, .02 + stack * .008, z);
    part(.29, .004, .014, band, x, .052 + stack * .008, z - .059);
  }
  part(.34, .045, .47, dark, .59, .025, -.1);
  part(.28, .008, .11, new THREE.MeshBasicMaterial({ color: '#a3bc9e' }), .59, .053, -.25);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const material = column === 3 ? green : key;
      part(.049, .014, .045, material, .487 + column * .068, .057, -.137 + row * .063);
    }
  }
  return group;
}

export function disposeOfficeDisplay(group) {
  const materials = new Set();
  const textures = new Set();
  group.traverse(object => {
    object.geometry?.dispose();
    if (object.material) materials.add(object.material);
  });
  materials.forEach(material => {
    if (material.map) textures.add(material.map);
    material.dispose();
  });
  textures.forEach(texture => texture.dispose());
}