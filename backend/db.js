require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const db = {
  usuario: {
    findUnique: async ({ where }) => {
      const { data, error } = await supabase.from('usuarios').select('*').eq('nombre', where.nombre).single();
      if (error) throw error;
      return data;
    },
    findFirst: async () => {
      const { data, error } = await supabase.from('usuarios').select('*').limit(1).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    findMany: async () => {
      const { data, error } = await supabase.from('usuarios').select('*');
      if (error) throw error;
      return data;
    },
    create: async ({ data }) => {
      const { data: result, error } = await supabase.from('usuarios').insert(data).select().single();
      if (error) throw error;
      return result;
    }
  },
  producto: {
    findMany: async ({ where } = {}) => {
      let query = supabase.from('productos').select('*');
      if (where?.categoria) query = query.eq('categoria', where.categoria);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    findUnique: async ({ where }) => {
      const { data, error } = await supabase.from('productos').select('*').eq('id', where.id).single();
      if (error) throw error;
      return data;
    },
    create: async ({ data }) => {
      const { data: result, error } = await supabase.from('productos').insert(data).select().single();
      if (error) throw error;
      return result;
    },
    update: async ({ where, data }) => {
      const { data: result, error } = await supabase.from('productos').update(data).eq('id', where.id).select().single();
      if (error) throw error;
      return result;
    },
    delete: async ({ where }) => {
      const { error } = await supabase.from('productos').delete().eq('id', where.id);
      if (error) throw error;
    }
  },
  variante: {
    findMany: async ({ where } = {}) => {
      let query = supabase.from('variantes').select('*');
      if (where?.productoId) query = query.eq('producto_id', where.productoId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    findUnique: async ({ where }) => {
      const { data, error } = await supabase.from('variantes').select('*').eq('id', where.id).single();
      if (error) throw error;
      return data;
    },
    create: async ({ data }) => {
      const { data: result, error } = await supabase.from('variantes').insert(data).select().single();
      if (error) throw error;
      return result;
    },
    update: async ({ where, data }) => {
      const { data: result, error } = await supabase.from('variantes').update(data).eq('id', where.id).select().single();
      if (error) throw error;
      return result;
    },
    delete: async ({ where }) => {
      const { error } = await supabase.from('variantes').delete().eq('id', where.id);
      if (error) throw error;
    }
  },
  cliente: {
    findMany: async () => {
      const { data, error } = await supabase.from('clientes').select('*');
      if (error) throw error;
      return data;
    },
    create: async ({ data }) => {
      const { data: result, error } = await supabase.from('clientes').insert(data).select().single();
      if (error) throw error;
      return result;
    }
  },
  venta: {
    findMany: async ({ where } = {}) => {
      let query = supabase.from('ventas').select('*, vendedor:vendedores(nombre), cliente:clientes(nombre)');
      if (where?.vendedorId) query = query.eq('vendedor_id', where.vendedorId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    create: async ({ data }) => {
      const { data: result, error } = await supabase.from('ventas').insert(data).select().single();
      if (error) throw error;
      return result;
    }
  },
  ventaDetalle: {
    createMany: async ({ data }) => {
      const { error } = await supabase.from('venta_detalles').insert(data);
      if (error) throw error;
    }
  },
  productoImagen: {
    findMany: async ({ where }) => {
      const { data, error } = await supabase.from('producto_imagenes').select('*').eq('producto_id', where.productoId);
      if (error) throw error;
      return data;
    },
    create: async ({ data }) => {
      const { data: result, error } = await supabase.from('producto_imagenes').insert(data).select().single();
      if (error) throw error;
      return result;
    },
    delete: async ({ where }) => {
      const { error } = await supabase.from('producto_imagenes').delete().eq('id', where.id);
      if (error) throw error;
    }
  }
};

module.exports = db;