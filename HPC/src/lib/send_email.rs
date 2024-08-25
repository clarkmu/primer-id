use anyhow::Result;
use lettre::{ message::{ header::{ self, ContentType }, Mailboxes, Message }, SmtpTransport };
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

    let Locations { admin_email, .. } = load_locations().expect("Error loading locations.");

    if is_dev {
        println!("Email: {} - {}", subject, body);
        return Ok(());
    }

    let mut to = String::from(to_email);

    if include_admin {
        to.push_str(&format!(", {}", &admin_email));
    }

    let mailboxes: Mailboxes = to.parse()?;
    let to_header: header::To = mailboxes.into();

    //todo from and SmtpTransport::relay
    let _email = Message::builder()
        .from("".parse()?)
        .mailbox(to_header)
        .subject(subject)
        .header(ContentType::TEXT_HTML)
        .body(String::from(body))?;

    let _mailer = SmtpTransport::relay("")?.build();

    Ok(())
}
