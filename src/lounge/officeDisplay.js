import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { companyLogoAccent, companyLogoUrl } from '../data/companyLogo.js';

export function createLoungeSurfaceTexture(repeatX, repeatY, weave = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(256, 256);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const pixel = index / 4;
    const grain = ((Math.imul(pixel + 1, 1664525) + 1013904223) >>> 16) % 17;
    const thread = weave && ((pixel % 256) % 4 === 0 || Math.floor(pixel / 256) % 4 === 0) ? 12 : 0;
    const value = 232 + grain - thread;
    pixels.data[index] = value;
    pixels.data[index + 1] = value;
    pixels.data[index + 2] = value;
    pixels.data[index + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

export function createLoungeChair() {
  const chair = new THREE.Group();
  chair.name = 'neutral-upholstered-lounge-chair';
  const fabric = createLoungeSurfaceTexture(3, 3, true);
  const upholstery = new THREE.MeshStandardMaterial({ color: '#90958f', map: fabric, bumpMap: fabric, bumpScale: .007, roughness: .96 });
  const wood = new THREE.MeshStandardMaterial({ color: '#3b322c', roughness: .65 });
  const add = (width, height, depth, material, x, y, z, radius = .035) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 2, radius), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    chair.add(mesh);
    return mesh;
  };
  for (const x of [-.48, .48]) for (const z of [-.42, .42]) add(.085, .33, .085, wood, x, .165, z, .012);
  add(1.16, .19, 1.07, upholstery, 0, .385, 0, .07);
  add(.96, .18, .89, upholstery, 0, .565, .04, .065);
  const back = add(1.07, .87, .23, upholstery, 0, .91, -.43, .075);
  back.rotation.x = .12;
  for (const side of [-1, 1]) add(.2, .37, 1.09, upholstery, side * .585, .63, -.015, .065);
  return chair;
}

export function createCompanyMugTexture(company) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  context.fillStyle = '#e6e0cc';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const logo = new Image();
  logo.onload = () => {
    context.drawImage(logo, 384, 128, 256, 256);
    texture.needsUpdate = true;
  };
  logo.src = companyLogoUrl(company.acronym, company.name, company.logoStyle, company.logoAccent);
  return texture;
}

export function createRetroComputerTexture({ company, date, mail, desktopUrl }) {
  const canvas = document.createElement('canvas');
  canvas.width = 920;
  canvas.height = 640;
  const context = canvas.getContext('2d');
  context.fillStyle = '#102c20';
  context.fillRect(0, 0, 920, 640);
  context.strokeStyle = '#85a579';
  context.lineWidth = 3;
  context.strokeRect(12, 12, 896, 616);
  context.strokeRect(26, 26, 655, 96);
  context.strokeRect(697, 26, 197, 96);
  context.fillStyle = '#d0ddb2';
  context.font = 'bold 30px monospace';
  context.fillText(`${company}NET / FRONT OFFICE`, 44, 65, 615);
  context.font = '22px monospace';
  context.fillText('NEWS, RECORDS & COMPANY MAIL', 44, 99, 615);
  context.fillText(new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 30, 162);
  [
    ['WRESTLER STATS', 'ROSTER / RECORDS / MOMENTUM'],
    ['WORLD RANKINGS', 'CONTENDERS / TITLE PICTURE'],
    ['EMAIL', mail ? `${mail} UNREAD MESSAGE${mail === 1 ? '' : 'S'}` : 'INBOX UP TO DATE'],
  ].forEach(([heading, detail], index) => {
    const top = 188 + index * 120;
    context.strokeRect(26, top, 868, 104);
    context.fillStyle = '#d0ddb2';
    context.font = 'bold 32px monospace';
    context.fillText(heading, 46, top + 40);
    context.fillStyle = '#9cbb89';
    context.font = '23px monospace';
    context.fillText(detail, 46, top + 78);
  });
  context.fillText('C:\\FRONT-OFFICE> _', 30, 585);
  context.fillStyle = 'rgba(0,0,0,.12)';
  for (let line = 0; line < 640; line += 4) context.fillRect(0, line, 920, 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const logo = new Image();
  logo.onload = () => {
    context.drawImage(logo, 701, 30, 189, 88);
    texture.needsUpdate = true;
  };
  logo.src = desktopUrl;
  return texture;
}

export function createWrestlingFigure({ skinColor, outfitColor, pose = 'flex', shirt = false, facePaint = false, longBlondHair = false, longBlackHair = false, trenchCoat = false }) {
  const figure = new THREE.Group();
  figure.name = 'wrestling-action-figure';
  const skin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: .38 });
  const outfit = new THREE.MeshStandardMaterial({ color: outfitColor, roughness: .4 });
  const boots = new THREE.MeshStandardMaterial({ color: '#202322', roughness: .4 });
  const hinge = new THREE.MeshStandardMaterial({ color: skinColor, roughness: .55 });
  const hair = longBlackHair ? new THREE.MeshStandardMaterial({ color: '#151618', roughness: .32 })
    : longBlondHair ? new THREE.MeshStandardMaterial({ color: '#d6b153', roughness: .5 }) : boots;
  const coat = trenchCoat ? new THREE.MeshStandardMaterial({ color: '#111314', roughness: .6, side: THREE.DoubleSide }) : null;
  let face = skin;
  if (facePaint) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.fillStyle = '#eeeee5';
    context.fillRect(0, 0, 256, 128);
    context.fillStyle = '#171a19';
    [52, 76].forEach(x => {
      context.beginPath();
      context.moveTo(x - 10, 45);
      context.lineTo(x + 9, 49);
      context.lineTo(x + 7, 62);
      context.lineTo(x + 2, 90);
      context.lineTo(x - 3, 65);
      context.lineTo(x - 9, 59);
      context.closePath();
      context.fill();
    });
    context.fillRect(55, 87, 18, 4);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    face = new THREE.MeshStandardMaterial({ map: texture, roughness: .4 });
  }
  const add = (geometry, material, position, scale = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    figure.add(mesh);
    return mesh;
  };
  const sphere = (radius, material, position, scale) => add(new THREE.SphereGeometry(radius, 12, 8), material, position, scale);
  const limb = (from, to, radius, material) => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    const mesh = add(new THREE.CylinderGeometry(radius, radius * .85, direction.length(), 10), material, start.clone().add(end).multiplyScalar(.5).toArray());
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  };
  sphere(.075, shirt ? outfit : skin, [0, .315, 0], [1.3, 1.2, .7]);
  sphere(.052, shirt ? outfit : skin, [0, .255, 0], [1.25, 1, .85]);
  add(new THREE.BoxGeometry(.115, .055, .075), outfit, [0, .218, 0]);
  if (trenchCoat) {
    const tails = add(new THREE.CylinderGeometry(.105, .135, .3, 20, 1, true, .5, Math.PI * 2 - 1), coat, [0, .235, -.008], [1, 1, .65]);
    tails.name = 'figure-black-trench-coat';
    [-1, 1].forEach(side => {
      const lapel = add(new THREE.BoxGeometry(.033, .105, .014), coat, [side * .044, .345, .05]);
      lapel.rotation.z = side * -.3;
    });
  }
  add(new THREE.CylinderGeometry(.025, .024, .028, 10), skin, [0, .404, 0]);
  const head = sphere(.048, face, [0, .455, .004], [1, 1.22, .87]);
  head.name = facePaint ? 'figure-painted-face' : 'figure-head';
  if (longBlackHair) {
    const crown = add(new THREE.SphereGeometry(.052, 16, 10, 0, Math.PI * 2, 0, Math.PI * .42), hair, [0, .455, .004], [1.13, 1.23, .98]);
    crown.name = 'figure-black-hair-crown';
    const backHair = sphere(.052, hair, [0, .4, -.039], [1.18, 2, .6]);
    backHair.name = 'figure-long-black-hair';
    [-1, 1].forEach(side => {
      const sideHair = sphere(.03, hair, [side * .049, .397, .009], [.8, 2.9, .7]);
      sideHair.name = `figure-black-hair-side-${side}`;
    });
  } else {
    add(new THREE.SphereGeometry(.049, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair, [0, .473, .004], [1, .58, .88]);
  }
  if (longBlondHair && !longBlackHair) {
    const backHair = sphere(.043, hair, [0, .424, -.035], [1.12, 1.65, .4]);
    backHair.name = 'figure-long-blond-hair';
    [-1, 1].forEach(side => sphere(.026, hair, [side * .042, .422, -.002], [.75, 2.2, .65]));
  }
  [-1, 1].forEach(side => {
    sphere(.004, boots, [side * .017, .461, .043]);
    const hip = [side * .044, .205, 0];
    const knee = [side * .061, .128, .004];
    limb(hip, knee, .03, skin);
    sphere(.031, outfit, knee, [1, .8, 1]);
    limb([side * .061, .118, .004], [side * .066, .043, .004], .027, boots);
    add(new THREE.BoxGeometry(.058, .045, .09), boots, [side * .066, .0225, .025]);
    const shoulder = [side * .095, .357, 0];
    const raised = pose === 'salute' && side === -1;
    const elbow = raised ? [side * .15, .418, .006] : pose === 'flex' ? [side * .15, .34, .006] : [side * .123, .292, .006];
    const hand = raised ? [side * .122, .49, .02] : pose === 'flex' ? [side * .117, .405, .027] : [side * .119, .235, .025];
    sphere(trenchCoat ? .038 : .033, coat || hinge, shoulder);
    limb(shoulder, elbow, trenchCoat ? .033 : .026, coat || skin);
    sphere(trenchCoat ? .028 : .023, coat || hinge, elbow);
    limb(elbow, hand, trenchCoat ? .028 : .022, coat || skin);
    sphere(.026, skin, hand);
    sphere(.026, coat || outfit, elbow, [1.05, .52, 1.05]);
  });
  sphere(.011, facePaint ? new THREE.MeshStandardMaterial({ color: '#eeeee5', roughness: .4 }) : skin, [0, .451, .047], [.65, 1, 1]);
  return figure;
}

export function createLavaLamp() {
  const lamp = new THREE.Group();
  lamp.name = 'desk-lava-lamp';
  const metal = new THREE.MeshStandardMaterial({ color: '#bfc6c4', metalness: .75, roughness: .28 });
  const add = (geometry, material, y) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    lamp.add(mesh);
    return mesh;
  };
  add(new THREE.CylinderGeometry(.09, .12, .055, 24), metal, .0275);
  add(new THREE.CylinderGeometry(.055, .09, .12, 24), metal, .1125);
  const glass = add(new THREE.LatheGeometry([
    new THREE.Vector2(.055, .17), new THREE.Vector2(.082, .22),
    new THREE.Vector2(.08, .36), new THREE.Vector2(.065, .52),
    new THREE.Vector2(.038, .65),
  ], 32), new THREE.MeshStandardMaterial({ color: '#61d3ce', emissive: '#1a5d5b', emissiveIntensity: .25, transparent: true, opacity: .25, roughness: .18, depthWrite: false, side: THREE.DoubleSide }), 0);
  glass.renderOrder = 2;
  add(new THREE.ConeGeometry(.04, .085, 24), metal, .683);
  const wax = new THREE.MeshStandardMaterial({ color: '#f38148', emissive: '#e96728', emissiveIntensity: .7, roughness: .4 });
  add(new THREE.SphereGeometry(.063, 16, 12), wax, .193).scale.set(1, .28, 1);
  const blobs = [.036, .032, .023].map((radius, index) => {
    const blob = add(new THREE.SphereGeometry(radius, 16, 12), wax, .26 + index * .13);
    blob.scale.set(.85, 1.25, .85);
    blob.position.x = index % 2 ? -.012 : .012;
    return blob;
  });
  const glow = new THREE.PointLight('#fa8953', .3, 1.1, 2);
  glow.position.y = .3;
  lamp.add(glow);
  lamp.userData.blobs = blobs;
  return lamp;
}

export function updateLavaLamp(lamp, elapsed) {
  lamp.userData.blobs.forEach((blob, index) => {
    const phase = elapsed * .32 + index * 2.1;
    blob.position.y = .26 + index * .13 + Math.sin(phase) * (index === 1 ? .065 : .035);
    blob.position.x = Math.sin(phase * .7) * .012;
    blob.scale.y = 1.25 + Math.sin(phase + 1) * .2;
  });
}

function dollarBillTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 448;
  const context = canvas.getContext('2d');
  context.fillStyle = '#d3d5b9';
  context.fillRect(0, 0, 1024, 448);
  context.strokeStyle = '#45614b';
  context.lineWidth = 5;
  context.strokeRect(14, 14, 996, 420);
  context.lineWidth = 2;
  context.strokeRect(27, 27, 970, 394);
  for (let line = 0; line < 18; line += 1) {
    const inset = line * 2;
    context.strokeRect(40 + inset, 40 + inset, 944 - inset * 2, 368 - inset * 2);
  }
  context.fillStyle = '#d3d5b9';
  context.fillRect(118, 54, 788, 340);
  context.fillStyle = '#314d39';
  context.textAlign = 'center';
  context.font = 'bold 30px Georgia, serif';
  context.fillText('THE UNITED STATES OF AMERICA', 512, 79);
  context.font = 'bold 23px Georgia, serif';
  context.fillText('FEDERAL RESERVE NOTE', 512, 110);
  context.fillText('ONE HUNDRED DOLLARS', 512, 387);
  for (const [x, y] of [[83, 104], [941, 104], [83, 381], [941, 381]]) {
    context.font = 'bold 48px Georgia, serif';
    context.fillText('100', x, y);
  }
  context.beginPath();
  context.ellipse(512, 242, 109, 123, 0, 0, Math.PI * 2);
  context.stroke();
  for (let hatch = -8; hatch <= 8; hatch += 1) {
    context.beginPath();
    context.ellipse(512, 242, 109 + hatch * .6, 123 + hatch * .6, 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.fillStyle = '#799079';
  context.beginPath();
  context.ellipse(512, 214, 42, 57, -.12, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#45614b';
  context.beginPath();
  context.moveTo(451, 340);
  context.quadraticCurveTo(453, 270, 488, 266);
  context.lineTo(536, 266);
  context.quadraticCurveTo(576, 275, 583, 340);
  context.closePath();
  context.fill();
  context.lineWidth = 1;
  for (let hatch = 0; hatch < 13; hatch += 1) {
    context.beginPath();
    context.moveTo(478, 177 + hatch * 5);
    context.lineTo(541, 183 + hatch * 5);
    context.stroke();
  }
  for (const x of [270, 754]) {
    context.beginPath();
    context.arc(x, 230, 40, 0, Math.PI * 2);
    context.stroke();
    context.font = 'bold 26px Georgia, serif';
    context.fillText(x === 270 ? 'B' : '$', x, 239);
  }
  context.font = '20px monospace';
  context.fillText('AB 01996100 A', 267, 315);
  context.fillText('AB 01996100 A', 758, 166);
  context.font = 'italic 14px Georgia, serif';
  context.fillText('Treasurer', 754, 332);
  context.fillText('Secretary of the Treasury', 269, 352);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCompanyEmblem(company, texture) {
  const group = new THREE.Group();
  group.name = 'raised-company-emblem';
  const accent = company.logoAccent ?? companyLogoAccent(company.acronym, company.name);
  const geometry = new THREE.PlaneGeometry(2.7, 2.7);
  const edgeMaterial = new THREE.MeshStandardMaterial({ map: texture, color: new THREE.Color(accent).multiplyScalar(.45), transparent: true, alphaTest: .05, roughness: .45, metalness: .35, side: THREE.DoubleSide });
  for (let layer = 0; layer < 9; layer += 1) {
    const edge = new THREE.Mesh(geometry, edgeMaterial);
    edge.name = 'company-emblem-silhouette-edge';
    edge.position.z = .032 + layer * .011;
    group.add(edge);
  }
  const shadow = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture, color: '#000000', transparent: true, alphaTest: .05, opacity: .22, depthWrite: false, toneMapped: false }));
  shadow.name = 'company-emblem-wall-shadow';
  shadow.position.set(-.018, -.025, -.058);
  group.add(shadow);
  const face = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .05, toneMapped: false }),
  );
  face.name = 'company-emblem-logo-artwork';
  face.position.z = .132;
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
  const billFace = new THREE.MeshStandardMaterial({ map: dollarBillTexture(), roughness: .95 });
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
    const bundle = new THREE.Group();
    bundle.name = `cash-bundle-${stack}`;
    bundle.position.set(-.29 + stack * .38, 0, -.52 - stack * .012);
    group.add(bundle);
    for (let layer = 0; layer < 8; layer += 1) {
      const bill = part(.34, .005, .15, layer % 2 ? band : green, 0, .0025 + layer * .005, 0);
      bundle.add(bill);
    }
    const topBill = new THREE.Mesh(new THREE.PlaneGeometry(.34, .15), billFace);
    topBill.rotation.x = -Math.PI / 2;
    topBill.position.y = .0405;
    bundle.add(topBill);
    const strap = part(.035, .042, .154, band, 0, .021, 0);
    bundle.add(strap);
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