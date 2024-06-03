use lettre::{
    message::{ header::{ self, ContentType }, Mailbox, Mailboxes, Message, MessageBuilder },
    SmtpTransport,
};

pub struct Email {
    pub to: String,
    pub subject: String,
    pub body: String,
}

impl Email {
    pub fn new(to: String, from: String, subject: String, body: String) -> Email {
        Email {
            to,
            subject,
            body,
        }
    }

    pub async fn send(
        &self,
        include_admin: bool,
        is_dev: &bool
    ) -> Result<(), Result<(), Box<dyn std::error::Error>>> {
        if *is_dev {
            return Ok(());
        }

        let mut to = String::from(self.to.clone());

        if include_admin {
            to.push_str(", clarkmu@unc.edu");
        }

        // print!("TO: {:#?}\n", to);

        let mailboxes: Mailboxes = to.parse().unwrap();
        let to_header: header::To = mailboxes.into();

        //todo from and SmtpTransport::relay
        let email = Message::builder()
            .from("".parse().unwrap())
            .mailbox(to_header)
            .subject(&self.subject)
            .header(ContentType::TEXT_HTML)
            .body(String::from(&self.body))
            .unwrap();

        let mailer = SmtpTransport::relay("").unwrap().build();

        Ok(())
    }
}
