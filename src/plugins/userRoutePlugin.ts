import Hapi from '@hapi/hapi';
import * as dotenv from 'dotenv';
import { PrismaClient, Role } from '@prisma/client';

dotenv.config();

type TemplateFuncType = any;

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        templateName: TemplateFuncType;
    }
}

const UserRoutePlugin: Hapi.Plugin<null> = {
    name: 'userRoute',
    register: async (server: Hapi.Server) => {
        console.log('Registering user routes...'); 

        server.route([
            { 
                method: 'POST', 
                path: '/api/v1/users', 
                handler: createUserHandler, 
                options: { 
                    auth: false,
                    payload: { 
                        parse: true, 
                        allow: 'application/json'  
                    }
                } 
            },
            
            { method: 'GET', path: '/api/v1/users', handler: fetchUsersHandler, options: { auth: false } },
            { method: 'GET', path: '/api/v1/users/{id}', handler: getUserByIdHandler, options: { auth: false } },
            { method: 'PUT', path: '/api/v1/users/{id}', handler: updateUserHandler, options: { auth: false } },
            { method: 'DELETE', path: '/api/v1/users/{id}', handler: deleteUserHandler, options: { auth: false } },
            { method: 'GET', path: '/api/v1/users/search', handler: searchUsersHandler, options: { auth: false } },
            { method: 'GET', path: '/api/v1/users/list', handler: listUsersHandler, options: { auth: false } }

        ]);
        console.log('User routes registered successfully.');
    },
};

// Create User Handler
const createUserHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    console.log('Received Payload:', request.payload);
    const { fullname, email, password, roles } = request.payload as { fullname: string; email: string; password: string; roles: Role[] };
    const prisma = request.server.app.prisma as PrismaClient;

    try {
        const user = await prisma.users.create({
            data: { fullname, email, password, role: roles?.[0] }, // Assigns only the first role
        });
        

        return h.response({ version: '1.0.0', data: user }).code(201);
    } catch (error: any) {
        return h.response({ version: '1.0.0', error: error.message }).code(500);
    }
};

// Fetch All Users Handler
const fetchUsersHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const prisma = request.server.app.prisma as PrismaClient;

    try {
        const users = await prisma.users.findMany();

        return h.response({ version: '1.0.0', data: users }).code(200);
    } catch (error: any) {
        return h.response({ version: '1.0.0', error: error.message }).code(500);
    }
};

// Get User by ID Handler
const getUserByIdHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { id } = request.params as { id: string };
    const prisma = request.server.app.prisma as PrismaClient;

    try {
        const user = await prisma.users.findUnique({ where: { id } });

        if (!user) {
            return h.response({ version: '1.0.0', error: 'User not found' }).code(404);
        }

        return h.response({ version: '1.0.0', data: user }).code(200);
    } catch (error: any) {
        return h.response({ version: '1.0.0', error: error.message }).code(500);
    }
};

// Update User Handler
const updateUserHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { id } = request.params as { id: string };
    const { fullname, email, password, roles } = request.payload as { fullname?: string; email?: string; password?: string; roles?: Role[] };
    const prisma = request.server.app.prisma as PrismaClient;

    try {
        const updatedUser = await prisma.users.update({
            where: { id },
            data: { fullname, email, password, ...(roles ? { role: roles[0] } : {}) },
        });
        

        return h.response({ version: '1.0.0', data: updatedUser }).code(200);
    } catch (error: any) {
        return h.response({ version: '1.0.0', error: error.message }).code(500);
    }
};

// Delete User Handler
const deleteUserHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { id } = request.params as { id: string };
    const prisma = request.server.app.prisma as PrismaClient;

    try {
        await prisma.users.delete({ where: { id } });

        return h.response({ version: '1.0.0', message: 'User deleted successfully' }).code(200);
    } catch (error: any) {
        return h.response({ version: '1.0.0', error: error.message }).code(500);
    }
};

// Search Users Handler

const searchUsersHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { fullname, email, roles } = request.query as { fullname?: string; email?: string; roles?: Role[] };
    const prisma = request.server.app.prisma as PrismaClient;

    try {
        const users = await prisma.users.findMany({
            where: {
                OR: [
                    fullname ? { fullname: { contains: fullname, mode: 'insensitive' } } : {},
                    email ? { email: { contains: email, mode: 'insensitive' } } : {},
                ],
                ...(roles ? { role: { in: roles } } : {}),
            },
        });

        return h.response({ version: '1.0.0', data: users }).code(200);
    } catch (error: any) {
        return h.response({ version: '1.0.0', error: error.message }).code(500);
    }
};

const listUsersHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const prisma = request.server.app.prisma as PrismaClient;
    const { fullname, email, role, sortBy, sortOrder, page, limit } = request.query as {
        fullname?: string;
        email?: string;
        role?: Role;
        sortBy?: 'fullname' | 'email' | 'createdAt';
        sortOrder?: 'asc' | 'desc';
        page?: number;
        limit?: number;
    };

    try {
        const pageNum = Number(page) || 1;
        const pageSize = Number(limit) || 10;
        const skip = (pageNum - 1) * pageSize;

        const users = await prisma.users.findMany({
            where: {
                AND: [
                    fullname ? { fullname: { contains: fullname, mode: 'insensitive' } } : {},
                    email ? { email: { contains: email, mode: 'insensitive' } } : {},
                    role ? { role } : {},
                ],
            },
            orderBy: sortBy
            ? { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' }
            : { createdAt: 'desc' } as any, // Use 'as any' to bypass TypeScript error
        
            skip,
            take: pageSize,
        });

        const totalUsers = await prisma.users.count({
            where: {
                AND: [
                    fullname ? { fullname: { contains: fullname, mode: 'insensitive' } } : {},
                    email ? { email: { contains: email, mode: 'insensitive' } } : {},
                    role ? { role } : {},
                ],
            },
        });

        return h.response({
            version: '1.0.0',
            data: users,
            pagination: {
                totalUsers,
                totalPages: Math.ceil(totalUsers / pageSize),
                currentPage: pageNum,
                pageSize,
            },
        }).code(200);
    } catch (error: any) {
        return h.response({ version: '1.0.0', error: error.message }).code(500);
    }
};


export default UserRoutePlugin;
