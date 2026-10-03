import * as THREE from 'three';

export function createCardBook() {
  const book = new THREE.Group();
  book.name = 'lounge-card-book';
  const leather = new THREE.MeshStandardMaterial({ color: '#121416', roughness: .9 });
  const page = new THREE.MeshStandardMaterial({ color: '#24292c', roughness: .65 });
  const seam = new THREE.MeshStandardMaterial({ color: '#62696b', roughness: .5, metalness: .3 });
  const sleeve = new THREE.MeshPhysicalMaterial({ color: '#d2e2e4', transparent: true, opacity: .12, roughness: .16, depthWrite: false });
  const part = (width, height, depth, material, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    book.add(mesh);
    return mesh;
  };
  part(.88, .045, .58, leather, 0, .025, 0);
  part(.045, .026, .56, leather, 0, .057, 0);
  [-1, 1].forEach(side => {
    part(.4, .028, .53, page, side * .224, .055, 0);
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        const x = side * .224 - .129 + column * .129;
        const z = -.169 + row * .169;
        const color = ['#cf493e', '#259b82', '#397fca', '#c59b31'][(row + column + (side > 0 ? 1 : 0)) % 4];
        const border = new THREE.MeshStandardMaterial({ color, roughness: .5, metalness: .25 });
        part(.107, .003, .144, border, x, .074, z);
        part(.09, .002, .087, leather, x, .077, z - .013);
        part(.082, .002, .015, seam, x, .08, z + .045);
        part(.116, .002, .153, sleeve, x, .085, z);
        part(.003, .002, .156, seam, x - .059, .087, z);
        part(.12, .002, .003, seam, x, .087, z + .079);
      }
    }
  });
  [-.19, 0, .19].forEach(z => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.018, .004, 8, 16), seam);
    ring.position.set(0, .083, z);
    book.add(ring);
  });
  return book;
}