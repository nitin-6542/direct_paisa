import { z } from 'zod';
import { insertUserSchema, insertLeadSchema, insertAttendanceSchema, insertCompanySchema, insertAboutUsSchema, users, leads, attendance, companies, aboutUs } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ email: z.string().email(), password: z.string() }),
      responses: {
        200: z.object({ token: z.string(), user: z.custom<Omit<typeof users.$inferSelect, "password">>() }),
        401: errorSchemas.unauthorized,
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<Omit<typeof users.$inferSelect, "password">>(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users' as const,
      responses: {
        200: z.array(z.custom<Omit<typeof users.$inferSelect, "password">>()),
        401: errorSchemas.unauthorized,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/users' as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<Omit<typeof users.$inferSelect, "password">>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/users/:id' as const,
      input: insertUserSchema.partial(),
      responses: {
        200: z.custom<Omit<typeof users.$inferSelect, "password">>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/users/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      }
    }
  },
  leads: {
    list: {
      method: 'GET' as const,
      path: '/api/leads' as const,
      responses: {
        200: z.array(z.custom<typeof leads.$inferSelect>()),
        401: errorSchemas.unauthorized,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/leads' as const,
      input: insertLeadSchema,
      responses: {
        201: z.custom<typeof leads.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/leads/:id' as const,
      input: insertLeadSchema.partial(),
      responses: {
        200: z.custom<typeof leads.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      }
    }
  },
  attendance: {
    list: {
      method: 'GET' as const,
      path: '/api/attendance' as const,
      responses: {
        200: z.array(z.custom<typeof attendance.$inferSelect>()),
        401: errorSchemas.unauthorized,
      }
    },
    checkin: {
      method: 'POST' as const,
      path: '/api/attendance/checkin' as const,
      input: z.object({ lat: z.string(), lng: z.string() }),
      responses: {
        201: z.custom<typeof attendance.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    checkout: {
      method: 'POST' as const,
      path: '/api/attendance/checkout' as const,
      input: z.object({ lat: z.string(), lng: z.string() }),
      responses: {
        200: z.custom<typeof attendance.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      }
    }
  },
  location: {
    update: {
      method: 'POST' as const,
      path: '/api/location/update' as const,
      input: z.object({ lat: z.string(), lng: z.string() }),
      responses: {
        200: z.object({ success: z.boolean() }),
      }
    },
    team: {
      method: 'GET' as const,
      path: '/api/location/team' as const,
      responses: {
        200: z.array(z.object({
          userId: z.number(),
          name: z.string(),
          lat: z.string(),
          lng: z.string(),
          timestamp: z.string()
        })),
      }
    }
  },

  companies: {
    list: {
      method: 'GET' as const,
      path: '/api/companies' as const,
      responses: {
        200: z.array(z.custom<typeof companies.$inferSelect>()),
        401: errorSchemas.unauthorized,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/companies' as const,
      input: insertCompanySchema,
      responses: {
        201: z.custom<typeof companies.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/companies/:id' as const,
      input: insertCompanySchema.partial(),
      responses: {
        200: z.custom<typeof companies.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/companies/:id' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    }
  },

  aboutUs: {
    get: {
      method: 'GET' as const,
      path: '/api/about-us' as const,
      responses: {
        200: z.custom<typeof aboutUs.$inferSelect>().optional(),
      }
    },
    update: {
      method: 'POST' as const,
      path: '/api/about-us' as const,
      input: z.object({ content: z.string() }),
      responses: {
        200: z.custom<typeof aboutUs.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    }
  },

  dashboard: {
    method: 'GET' as const,
    path: '/api/dashboard' as const,
    responses: {
      200: z.object({
        totalLeads: z.number(),
        todayAttendance: z.union([z.string(), z.number()]),
        activeEmployees: z.number().nullable(),
        conversionRate: z.string(),
        recentActivity: z.array(
          z.object({
            id: z.string(),
            type: z.string(),
            action: z.string(),
            name: z.string(),
            company: z.string().optional(),
            location: z.string().optional(),
            time: z.any()
          })
        )
      }),
      401: errorSchemas.unauthorized,
    }
  },

  upload: {
    image: {
      method: 'POST' as const,
      path: '/api/upload' as const,
      input: z.any(),
      responses: {
        200: z.object({
          url: z.string(),
          publicId: z.string()
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        500: errorSchemas.internal,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
