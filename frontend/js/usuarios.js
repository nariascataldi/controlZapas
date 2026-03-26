import { fetchAPI } from './api.js';

export async function cargarListaUsuarios() {
    if (!window.location.pathname.endsWith('vendedores.html')) return;
    const tbody = document.getElementById('listaUsuariosBody');
    if (!tbody) return;

    try {
        const usuarios = await fetchAPI('/usuarios');
        tbody.innerHTML = '';
        if (usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No existen usuarios aún.</td></tr>';
            return;
        }

        usuarios.forEach(u => {
            const tr = document.createElement('tr');
            tr.className = 'border-bottom border-light align-middle';

            tr.innerHTML = `
                <td class="py-3">
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle bg-light text-secondary me-3 d-flex justify-content-center align-items-center" style="width:36px; height:36px">
                            <i class="bi bi-person-fill"></i>
                        </div>
                        <span class="fw-semibold color-dark">${u.nombre}</span>
                    </div>
                </td>
                <td class="py-3">
                    ${u.rol === 'ADMIN' ? '<span class="badge rounded-pill bg-dark">ADMIN</span>' : '<span class="badge border border-secondary text-secondary rounded-pill bg-transparent">VENDEDOR</span>'}
                </td>
                <td class="py-3 fw-medium ${u.rol === 'ADMIN' ? 'text-muted' : 'text-success'}">
                    ${u.rol === 'ADMIN' ? '-' : u.porcentaje_comision + '%'}
                </td>
                <td class="py-3 text-end">
                    <button class="btn btn-sm btn-light border rounded-circle shadow-sm me-1" style="width:32px; height:32px; padding:0;" onclick="editarUsuario(${u.id}, '${u.nombre}', '${u.rol}', ${u.porcentaje_comision})" title="Editar">
                        <i class="bi bi-pencil-square text-secondary"></i>
                    </button>
                    <button class="btn btn-sm btn-light border rounded-circle shadow-sm" style="width:32px; height:32px; padding:0;" onclick="eliminarUsuario(${u.id})" title="Eliminar">
                        <i class="bi bi-trash-fill text-danger"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Error cargando usuarios:', e);
    }
}

const formUsuario = document.getElementById('formUsuario');
if (formUsuario) {
    formUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('userId').value;
        const nombre = document.getElementById('userNombre').value.trim();
        const password = document.getElementById('userPassword').value;
        const rol = document.getElementById('userRol').value;
        const pComision = parseFloat(document.getElementById('userComision').value) || 0;

        const url = id ? `/usuarios/${id}` : '/usuarios';
        const method = id ? 'PUT' : 'POST';

        if (!id && !password) return alert('La contraseña es obligatoria para un nuevo usuario.');

        const payload = { nombre, rol, porcentaje_comision: pComision };
        if (password) payload.password = password;

        try {
            await fetchAPI(url, { method, body: JSON.stringify(payload) });
            const modalEl = document.getElementById('modalUsuario');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            cargarListaUsuarios();
        } catch (error) {
            alert('Error al guardar usuario: ' + error.message);
        }
    });

    document.getElementById('modalUsuario').addEventListener('show.bs.modal', function (event) {
        if (!event.relatedTarget || !event.relatedTarget.closest('.btn-light')) {
        } else {
            document.getElementById('userId').value = '';
            document.getElementById('formUsuario').reset();
            document.getElementById('modalUsuarioLabel').textContent = 'Nuevo Integrante de Staff';
            document.getElementById('userPasswordHelp').textContent = 'Requerida al crear un nuevo usuario.';
        }
    });
}

export function editarUsuario(id, nombre, rol, comision) {
    document.getElementById('userId').value = id;
    document.getElementById('userNombre').value = nombre;
    document.getElementById('userPassword').value = '';
    document.getElementById('userRol').value = rol;
    document.getElementById('userComision').value = comision;

    document.getElementById('modalUsuarioLabel').textContent = 'Editar Integrante';
    document.getElementById('userPasswordHelp').textContent = 'Dejar vacío si no se desea cambiar.';

    const modal = new bootstrap.Modal(document.getElementById('modalUsuario'));
    modal.show();
}

export async function eliminarUsuario(id) {
    if (confirm('¿Estás seguro de eliminar este usuario del staff?')) {
        try {
            await fetchAPI(`/usuarios/${id}`, { method: 'DELETE' });
            cargarListaUsuarios();
        } catch (e) {
            alert('Error eliminando usuario: ' + e.message);
        }
    }
}

window.editarUsuario = editarUsuario;
window.eliminarUsuario = eliminarUsuario;
window.cargarListaUsuarios = cargarListaUsuarios;
