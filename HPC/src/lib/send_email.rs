use anyhow::{ Result, Context };
use mail_send::{ mail_builder::MessageBuilder, SmtpClientBuilder };
use crate::{
    load_env_vars::{ load_env_vars, EnvVars },
    load_locations::{ load_locations, Locations },
};

pub async fn send_email(
    subject: &str,
    body: &str,
    to_email: &str,
    include_admin: bool
) -> Result<()> {
    let EnvVars { is_dev, .. } = load_env_vars();

    let Locations { admin_email, smtp_address, smtp_port, .. } = load_locations().expect(
        "Error loading locations."
    );

    if is_dev {
        println!("Email: {} - {}", subject, body);
        return Ok(());
    }

    let mut to = vec![to_email];

    if include_admin {
        to.push(&admin_email);
    }

    let body_html: &str = &body.replace("\n", "<br>");

    let message = MessageBuilder::new()
        .from(admin_email.clone())
        .to(to)
        .subject(subject)
        .html_body(body_html);
    // .text_body("Hello world!");

    SmtpClientBuilder::new(smtp_address, smtp_port)
        .implicit_tls(false)
        .connect().await
        .context("Failed to connect to SMTP server.")?
        .send(message).await
        .context("Failed to send email.")?;

    Ok(())
}
