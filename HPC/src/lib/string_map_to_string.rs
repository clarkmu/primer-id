// efficiently do a joined string.map(k => string)

pub fn string_map_to_string<I, F>(iter: I, mut f: F) -> String
    where I: IntoIterator, F: FnMut(&mut String, I::Item)
{
    let mut s = String::new();
    let mut first = true;

    for item in iter {
        if !first {
            s.push_str("<br>");
        }
        first = false;
        f(&mut s, item);
    }

    s
}
