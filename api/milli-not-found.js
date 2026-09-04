export default function handler(req,res){
  res.setHeader('Cache-Control','public, s-maxage=60');
  return res.status(404).json({error:'not_found',service:'MilliAPI',canonical:'https://milliapi.com'});
}
