import * as THREE from 'three';

function labelTexture(lines, background, foreground = '#f4f4ee', wide = false) {
  const canvas = document.createElement('canvas');
  canvas.width = wide ? 1024 : 384;
  canvas.height = wide ? 256 : 512;
  const context = canvas.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = foreground;
  context.lineWidth = 4;
  context.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  context.textAlign = 'center';
  lines.forEach((line, index) => {
    context.fillStyle = foreground;
    context.font = wide ? `${index === 1 ? 'bold 72px' : '32px'} sans-serif` : `${index === 1 ? 'bold 42px' : '24px'} sans-serif`;
    context.fillText(line, canvas.width / 2, wide ? 86 + index * 88 : 132 + index * 82, canvas.width - 68);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createVendingMachine(packs, companyLogo = null) {
  const machine = new THREE.Group();
  machine.name = 'lounge-pack-vending-machine';
  const shell = new THREE.MeshStandardMaterial({ color: '#244f49', roughness: .4, metalness: .6 });
  const trim = new THREE.MeshStandardMaterial({ color: '#a6b9b8', roughness: .25, metalness: .85 });
  const black = new THREE.MeshStandardMaterial({ color: '#111817', roughness: .65 });
  const light = new THREE.MeshBasicMaterial({ color: '#d2f3de' });
  const part = (width, height, depth, material, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    machine.add(mesh);
    return mesh;
  };
  part(1.85, 3.45, .8, shell, 0, 1.8, 0);
  part(1.65, 2.22, .05, black, 0, 2.02, .405);
  part(1.25, 2.05, .04, black, -.15, 2.04, .44);
  [-.8, .53].forEach(x => part(.025, 2.14, .05, light, x, 2.04, .49));
  Array.from({ length: 6 }, (_, row) => 1.03 + row * .33).forEach(y => part(1.23, .035, .19, trim, -.15, y, .48));
  part(1.67, .43, .07, black, 0, 3.29, .45);
  const marquee = new THREE.Mesh(
    new THREE.PlaneGeometry(1.58, .36),
    new THREE.MeshBasicMaterial({ map: labelTexture(['TRADING CARD', 'PACK DROP'], '#122c28', '#f4f4ee', true), toneMapped: false }),
  );
  marquee.position.set(0, 3.29, .49);
  machine.add(marquee);
  const foilGeometry = new THREE.BoxGeometry(.14, .24, .035);
  const foilTrim = new THREE.MeshStandardMaterial({ color: '#dde5e2', metalness: .85, roughness: .3 });
  const logoMaterial = new THREE.MeshBasicMaterial({ map: companyLogo, transparent: true, depthWrite: false, toneMapped: false });
  machine.userData.packLogoMaterial = logoMaterial;
  packs.forEach((pack, column) => {
    const material = new THREE.MeshStandardMaterial({ color: pack.color, metalness: .45, roughness: .35 });
    const label = new THREE.MeshBasicMaterial({
      map: labelTexture(['', pack.name.replace(' Pack', '').toUpperCase(), 'TRADING CARDS'], pack.color),
      toneMapped: false,
    });
    for (let row = 0; row < 6; row += 1) {
      const x = -.69 + column * (1.08 / Math.max(1, packs.length - 1));
      const y = 1.18 + row * .33;
      const packet = new THREE.Mesh(foilGeometry, material);
      packet.position.set(x, y, .48);
      packet.castShadow = true;
      machine.add(packet);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(.13, .22), label);
      face.position.set(x, y, .501);
      machine.add(face);
      const logo = new THREE.Mesh(new THREE.PlaneGeometry(.06, .06), logoMaterial);
      logo.name = 'pack-company-logo';
      logo.position.set(x, y + .074, .504);
      machine.add(logo);
      [-.114, .114].forEach(offset => part(.14, .013, .04, foilTrim, x, y + offset, .48));
    }
  });
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 2.08),
    new THREE.MeshPhysicalMaterial({ color: '#d6f0e5', transparent: true, opacity: .08, roughness: .12, metalness: .15, depthWrite: false }),
  );
  glass.position.set(-.15, 2.05, .565);
  machine.add(glass);
  part(.2, .24, .05, light, .7, 2.7, .49);
  for (let button = 0; button < 9; button += 1) {
    part(.052, .06, .025, trim, .64 + (button % 3) * .07, 2.3 - Math.floor(button / 3) * .1, .51);
  }
  part(.14, .024, .025, black, .7, 1.77, .51);
  part(.16, .19, .035, trim, .7, 1.53, .49);
  part(1.5, .41, .055, trim, 0, .58, .445);
  part(1.34, .27, .06, black, 0, .59, .48);
  part(1.38, .045, .2, trim, 0, .43, .49);
  [-.63, .63].forEach(x => part(.23, .12, .58, black, x, .08, 0));
  const displayLight = new THREE.PointLight('#bce7d0', 6, 4.5);
  displayLight.position.set(0, 2.7, 1.4);
  machine.add(displayLight);
  return machine;
}