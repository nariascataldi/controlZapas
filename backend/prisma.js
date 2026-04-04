require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function mapToPrisma(result, error) {
  if (error) throw error;
  return result;
}

function transformResult(data) {
  if (!data) return null;
  if (Array.isArray(data)) {
    return data.map(item => transformSingle(item));
  }
  return transformSingle(data);
}

function transformSingle(item) {
  if (!item) return null;
  const transformed = {};
  for (const [key, value] of Object.entries(item)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    transformed[camelKey] = value;
  }
  return transformed;
}

const prisma = {
  usuario: {
    findUnique: async ({ where }) => {
      const { data, error } = await supabase.from('usuarios').select('*').eq('nombre', where.nombre).single();
      return transformResult(data, error);
    },
    findFirst: async ({ where } = {}) => {
      let query = supabase.from('usuarios').select('*');
      if (where?.id) query = query.eq('id', where.id);
      const { data, error } = await query.limit(1).single();
      return transformResult(data, error);
    },
    findMany: async ({ where } = {}) => {
      let query = supabase.from('usuarios').select('*');
      if (where?.id) query = query.eq('id', where.id);
      if (where?.rol) query = query.eq('rol', where.rol);
      const { data, error } = await query;
      return transformResult(data, error) || [];
    },
    create: async ({ data }) => {
      const dataLower = {};
      for (const [key, value] of Object.entries(data)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dataLower[snakeKey] = value;
      }
      const { data: result, error } = await supabase.from('usuarios').insert(dataLower).select().single();
      return transformResult(result, error);
    },
    update: async ({ where, data }) => {
      const dataLower = {};
      for (const [key, value] of Object.entries(data)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dataLower[snakeKey] = value;
      }
      const { data: result, error } = await supabase.from('usuarios').update(dataLower).eq('id', where.id).select().single();
      return transformResult(result, error);
    },
    delete: async ({ where }) => {
      const { error } = await supabase.from('usuarios').delete().eq('id', where.id);
      if (error) throw error;
    }
  },
  producto: {
    findMany: async ({ where, include } = {}) => {
      let query = supabase.from('productos').select('*');
      if (where?.id) query = query.eq('id', where.id);
      if (where?.categoria) query = query.eq('categoria', where.categoria);
      const { data, error } = await query;
      
      let result = transformResult(data, error) || [];
      
      if (include?.variantes) {
        const productosConVariantes = [];
        for (const producto of result) {
          const { data: variantes, error: varError } = await supabase
            .from('variantes')
            .select('*')
            .eq('producto_id', producto.id);
          productosConVariantes.push({
            ...producto,
            variantes: transformResult(variantes, varError) || []
          });
        }
        result = productosConVariantes;
      }
      
      return result;
    },
    findUnique: async ({ where }) => {
      const { data, error } = await supabase.from('productos').select('*').eq('id', where.id).single();
      return transformResult(data, error);
    },
    create: async ({ data }) => {
      const dataLower = {};
      for (const [key, value] of Object.entries(data)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dataLower[snakeKey] = value;
      }
      const { data: result, error } = await supabase.from('productos').insert(dataLower).select().single();
      return transformResult(result, error);
    },
    update: async ({ where, data }) => {
      const dataLower = {};
      for (const [key, value] of Object.entries(data)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dataLower[snakeKey] = value;
      }
      const { data: result, error } = await supabase.from('productos').update(dataLower).eq('id', where.id).select().single();
      return transformResult(result, error);
    },
    delete: async ({ where }) => {
      const { error } = await supabase.from('productos').delete().eq('id', where.id);
      if (error) throw error;
    }
  },
  variante: {
    findMany: async ({ where } = {}) => {
      let query = supabase.from('variantes').select('*');
      if (where?.id) query = query.eq('id', where.id);
      if (where?.productoId) query = query.eq('producto_id', where.productoId);
      if (where?.sku) query = query.eq('sku', where.sku);
      const { data, error } = await query;
      return transformResult(data, error) || [];
    },
    findUnique: async ({ where }) => {
      const { data, error } = where.sku 
        ? await supabase.from('variantes').select('*').eq('sku', where.sku).single()
        : await supabase.from('variantes').select('*').eq('id', where.id).single();
      return transformResult(data, error);
    },
    create: async ({ data }) => {
      const dataLower = {};
      for (const [key, value] of Object.entries(data)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dataLower[snakeKey] = value;
      }
      const { data: result, error } = await supabase.from('variantes').insert(dataLower).select().single();
      return transformResult(result, error);
    },
    update: async ({ where, data }) => {
      const dataLower = {};
      for (const [key, value] of Object.entries(data)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dataLower[snakeKey] = value;
      }
      const { data: result, error } = await supabase.from('variantes').update(dataLower).eq('id', where.id).select().single();
      return transformResult(result, error);
    },
    delete: async ({ where }) => {
      const { error } = await supabase.from('variantes').delete().eq('id', where.id);
      if (error) throw error;
    }
  },
  cliente: {
    findMany: async () => {
      const { data, error } = await supabase.from('clientes').select('*');
      return transformResult(data, error) || [];
    },
    findUnique: async ({ where }) => {
      const { data, error } = await supabase.from('clientes').select('*').eq('id', where.id).single();
      return transformResult(data, error);
    },
    create: async ({ data }) => {
      const dataLower = {};
      for (const [key, value] of Object.entries(data)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dataLower[snakeKey] = value;
      }
      const { data: result, error } = await supabase.from('clientes').insert(dataLower).select().single();
      return transformResult(result, error);
    },
    update: async ({ where, data }) => {
      const dataLower = {};
      for (const [key, value] of Object.entries(data)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dataLower[snakeKey] = value;
      }
      const { data: result, error } = await supabase.from('clientes').update(dataLower).eq('id', where.id).select().single();
      return transformResult(result, error);
    }
  },
  venta: {
    findMany: async ({ where } = {}) => {
      let query = supabase.from('ventas').select('*');
      if (where?.id) query = query.eq('id', where.id);
      if (where?.vendedorId) query = query.eq('vendedor_id', where.vendedorId);
      if (where?.clienteId) query = query.eq('cliente_id', where.clienteId);
      const { data, error } = await query;
      return transformResult(data, error) || [];
    },
    findUnique: async ({ where }) => {
      const { data, error } = await supabase.from('ventas').select('*').eq('id', where.id).single();
      return transformResult(data, error);
    },
    create: async ({ data }) => {
      const dataLower = {};
      for (const [key, value] of Object.entries(data)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dataLower[snakeKey] = value;
      }
      const { data: result, error } = await supabase.from('ventas').insert(dataLower).select().single();
      return transformResult(result, error);
    },
    update: async ({ where, data }) => {
      const dataLower = {};
      for (const [key, value] of Object.entries(data)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dataLower[snakeKey] = value;
      }
      const { data: result, error } = await supabase.from('ventas').update(dataLower).eq('id', where.id).select().single();
      return transformResult(result, error);
    }
  },
  ventaDetalle: {
    findMany: async ({ where } = {}) => {
      let query = supabase.from('venta_detalles').select('*');
      if (where?.ventaId) query = query.eq('venta_id', where.ventaId);
      const { data, error } = await query;
      return transformResult(data, error) || [];
    },
    create: async ({ data }) => {
      const dataLower = {};
      for (const [key, value] of Object.entries(data)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dataLower[snakeKey] = value;
      }
      const { data: result, error } = await supabase.from('venta_detalles').insert(dataLower).select();
      return transformResult(result, error);
    },
    createMany: async ({ data }) => {
      const dataLower = data.map(item => {
        const obj = {};
        for (const [key, value] of Object.entries(item)) {
          const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          obj[snakeKey] = value;
        }
        return obj;
      });
      const { error } = await supabase.from('venta_detalles').insert(dataLower);
      if (error) throw error;
    }
  },
  productoImagen: {
    findMany: async ({ where }) => {
      const { data, error } = await supabase.from('producto_imagenes').select('*').eq('producto_id', where.productoId);
      return transformResult(data, error) || [];
    },
    create: async ({ data }) => {
      const dataLower = {};
      for (const [key, value] of Object.entries(data)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dataLower[snakeKey] = value;
      }
      const { data: result, error } = await supabase.from('producto_imagenes').insert(dataLower).select().single();
      return transformResult(result, error);
    },
    delete: async ({ where }) => {
      const { error } = await supabase.from('producto_imagenes').delete().eq('id', where.id);
      if (error) throw error;
    }
  },
  $transaction: async (callback) => {
    return callback(prisma);
  },
  $disconnect: async () => {}
};

module.exports = prisma;