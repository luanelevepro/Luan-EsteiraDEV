import { PrismaClient, sis_profiles_notificacoes } from '@prisma/client';
import { prisma } from '../prisma';
export const getAllNotifications = async ({
  profileId,
}: {
  profileId: string;
}) => {
  return await prisma.sis_profiles_notificacoes.findMany({
    where: {
      id_profile: profileId,
    },
  });
};

export const getNotificationById = async (id: string) => {
  return await prisma.sis_profiles_notificacoes.findUnique({
    where: { id },
  });
};

export const createNotification = async (
  data: Omit<sis_profiles_notificacoes, 'id' | 'dt_created' | 'dt_updated'>
) => {
  return await prisma.sis_profiles_notificacoes.create({
    data,
  });
};

export const updateNotification = async (
  id: string,
  data: Partial<sis_profiles_notificacoes>
) => {
  return await prisma.sis_profiles_notificacoes.update({
    where: { id },
    data,
  });
};

export const deleteNotification = async (id: string) => {
  return await prisma.sis_profiles_notificacoes.delete({
    where: { id },
  });
};
