import { FastifyPlugin } from 'fastify';

interface MailerPluginOptions {
  host: string,
  username: string,
  password: string,
  fromEmail: string
}

export type MailerOptions = MailerPluginOptions;

export const Mailer: FastifyPlugin<MailerOptions>;

export default Mailer;

declare module 'fastify' {
  interface FastifyInstance {
    // remove once fastify-nodemailer has types
    nodemailer: any;
    // remove once point-of-view has the types fixed
    view: any;
    mailer: {
      // [key: string]: (member: { email: string }, text: string) => void,
      sendRegisterEmail: (member: { email: string, name: string }, link: string) => Promise<void>
      sendLoginEmail: (member: { email: string, name: string }, link: string) => Promise<void>
    };
  }
}
